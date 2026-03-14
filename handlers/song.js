const { getUserLang, t } = require('../utils/lang');
const admin = require('./admin');
/**
 * 🔍 Song Handler
 * Manages song search by name flow
 */

const ytdlp = require('../services/ytdlp');
const ffmpegService = require('../services/ffmpeg');
const cleanup = require('../services/cleanup');
const messages = require('../utils/messages');
const buttons = require('../utils/buttons');
const progress = require('../utils/progress');
const fs = require('fs');

/**
 * Initiate song search flow
 * @param {TelegramBot} bot 
 * @param {number} chatId 
 * @param {Map} userStates 
 */
async function initiateSongSearch(bot, chatId, userStates) {
    const lang = getUserLang(chatId);
    userStates.set(chatId, { action: 'awaiting_song_query' });
    await bot.sendMessage(chatId, t('ask_song_name', lang), {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buttons.getCancelButton(lang) }
    });
}

/**
 * Process song search query
 * @param {TelegramBot} bot 
 * @param {Message} msg 
 * @param {Map} userStates 
 */
async function processSongSearch(bot, msg, userStates) {
    const chatId = msg.chat.id;
    const query = msg.text.trim();

    // Send searching message
    const searchingMsg = await bot.sendMessage(chatId, t('searching', getUserLang(msg.from.id)), {
        parse_mode: 'HTML'
    });

    try {
        // Search YouTube
        const results = await ytdlp.searchYouTube(query, 10);

        if (results.length === 0) {
            await progress.safeEditMessage(
                bot,
                chatId,
                searchingMsg.message_id,
                t('no_results', getUserLang(msg.from.id))
            );
            return;
        }

        // Delete searching message
        await progress.safeDeleteMessage(bot, chatId, searchingMsg.message_id);

        // Store results in state
        userStates.set(chatId, {
            action: 'awaiting_song_selection',
            results: results,
            currentPage: 0,
            query: query
        });

        // Show first 5 results
        const hasMore = results.length > 5;
        const resultButtons = buttons.getSongResultButtons(results.slice(0, 5), 0, hasMore, getUserLang(msg.from.id));
        
        await bot.sendMessage(chatId, t('search_results', getUserLang(msg.from.id), query), {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: resultButtons
            }
        });

    } catch (error) {
        console.error('Song search error:', error);
        await progress.safeEditMessage(
            bot,
            chatId,
            searchingMsg.message_id,
            t('error_generic', getUserLang(msg.from.id))
        );
        userStates.delete(chatId);
    }
}

/**
 * Show more search results
 * @param {TelegramBot} bot 
 * @param {CallbackQuery} query 
 * @param {Map} userStates 
 */
async function showMoreResults(bot, query, userStates) {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const state = userStates.get(chatId);

    if (!state || !state.results) {
        await bot.sendMessage(chatId, t('session_expired', getUserLang(query.from.id)));
        return;
    }

    // Move to next page
    const nextPage = state.currentPage + 1;
    const startIdx = nextPage * 5;
    const endIdx = startIdx + 5;
    const pageResults = state.results.slice(startIdx, endIdx);

    if (pageResults.length === 0) {
        await bot.answerCallbackQuery(query.id, {
            text: '📭 No more results',
            show_alert: true
        });
        return;
    }

    // Update state
    userStates.set(chatId, {
        ...state,
        currentPage: nextPage
    });

    // Check if there are more results after this page
    const hasMore = endIdx < state.results.length;
    const resultButtons = buttons.getSongResultButtons(pageResults, startIdx, hasMore);

    try {
        await bot.editMessageReplyMarkup({
            inline_keyboard: resultButtons
        }, {
            chat_id: chatId,
            message_id: messageId
        });
    } catch (error) {
        // Ignore edit errors
        console.error('Edit markup error:', error.message);
    }
}

/**
 * Handle song selection from search results
 * @param {TelegramBot} bot 
 * @param {CallbackQuery} query 
 * @param {Map} userStates 
 */
async function handleSongSelection(bot, query, userStates) {
    const chatId = query.message.chat.id;
    const songIndex = parseInt(query.data.replace('song_', ''));
    const state = userStates.get(chatId);

    if (!state || !state.results) {
        await bot.sendMessage(chatId, t('session_expired', getUserLang(query.from.id)));
        return;
    }

    const selectedSong = state.results[songIndex];
    if (!selectedSong) {
        await bot.sendMessage(chatId, t('error_generic', getUserLang(query.from.id)));
        return;
    }

    // Fetch full video info
    const fetchingMsg = await bot.sendMessage(chatId, t('fetching_audio', getUserLang(query.from.id)), {
        parse_mode: 'HTML'
    });

    try {
        const videoInfo = await ytdlp.getVideoInfo(selectedSong.url);
        
        await progress.safeDeleteMessage(bot, chatId, fetchingMsg.message_id);

        // Update state with selected song
        userStates.set(chatId, {
            action: 'awaiting_song_audio_quality',
            videoInfo: videoInfo,
            url: selectedSong.url
        });

        // Show audio quality buttons
        const qualityButtons = buttons.getSongAudioQualityButtons(getUserLang(query.from.id));
        
        await bot.sendMessage(chatId, messages.getSongInfo(videoInfo), {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: qualityButtons
            }
        });

    } catch (error) {
        console.error('Song selection error:', error);
        await progress.safeEditMessage(
            bot,
            chatId,
            fetchingMsg.message_id,
            t('error_generic', getUserLang(query.from.id))
        );
    }
}

/**
 * Handle song audio quality selection
 * @param {TelegramBot} bot 
 * @param {CallbackQuery} query 
 * @param {Map} userStates 
 */
async function handleSongAudioQuality(bot, query, userStates) {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const bitrate = query.data.replace('saq_', '');
    const state = userStates.get(chatId);

    if (!state || !state.url) {
        await bot.sendMessage(chatId, '❌ Session expired. Please start again.');
        return;
    }

    // Send progress message
    const progressMsg = await bot.sendMessage(chatId, t('downloading_audio', getUserLang(query.from.id)), {
        parse_mode: 'HTML'
    });

    let audioPath = null;
    let mp3Path = null;

    try {
        // Download audio
        audioPath = await ytdlp.downloadAudio(state.url, bitrate, chatId);

        // Update progress
        await progress.safeEditMessage(
            bot,
            chatId,
            progressMsg.message_id,
            t('processing', getUserLang(query.from.id))
        );

        await sleep(500);

        // Convert to MP3
        mp3Path = await ffmpegService.convertToMp3(audioPath, bitrate);

        // Uploading
        await progress.safeEditMessage(
            bot,
            chatId,
            progressMsg.message_id,
            t('uploading', getUserLang(query.from.id))
        );

        // Check file
        const finalPath = mp3Path || audioPath;
        if (!fs.existsSync(finalPath)) {
            throw new Error('Audio file not found');
        }

        // Send as document
        await bot.sendDocument(chatId, finalPath, {
            caption: `🎶 ${state.videoInfo.title}\n\n🎧 Quality: ${bitrate} kbps`,
            parse_mode: 'HTML'
        });

        // Cleanup
        await progress.safeDeleteMessage(bot, chatId, progressMsg.message_id);
        
        await bot.sendMessage(chatId, t('download_success', getUserLang(query.from.id)), {
            parse_mode: 'HTML'
        });

        if (audioPath && audioPath !== mp3Path) {
            cleanup.scheduleDelete(audioPath);
        }
        if (mp3Path) {
            cleanup.scheduleDelete(mp3Path);
        }

        userStates.delete(chatId);

        // Show main menu
        const menuHandler = require('./menu');
        await menuHandler.showMainMenu(bot, chatId, userId);

    } catch (error) {
        console.error('Song download error:', error);
        
        await progress.safeEditMessage(
            bot,
            chatId,
            progressMsg.message_id,
            `❌ Download failed: ${error.message || 'Unknown error'}`
        );
        
        // Cleanup on error
        if (audioPath && fs.existsSync(audioPath)) {
            cleanup.scheduleDelete(audioPath);
        }
        if (mp3Path && fs.existsSync(mp3Path)) {
            cleanup.scheduleDelete(mp3Path);
        }
        
        userStates.delete(chatId);
    }
}

/**
 * Sleep helper function
 * @param {number} ms 
 * @returns {Promise}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    initiateSongSearch,
    processSongSearch,
    showMoreResults,
    handleSongSelection,
    handleSongAudioQuality
};