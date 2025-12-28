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

/**
 * Initiate song search flow
 * @param {TelegramBot} bot 
 * @param {number} chatId 
 * @param {Map} userStates 
 */
async function initiateSongSearch(bot, chatId, userStates) {
    userStates.set(chatId, { action: 'awaiting_song_query' });
    
    await bot.sendMessage(chatId, messages.getAskSongName(), {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: buttons.getCancelButton()
        }
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
    const searchingMsg = await bot.sendMessage(chatId, '🔍 Searching for songs...', {
        parse_mode: 'HTML'
    });

    try {
        // Search YouTube
        const results = await ytdlp.searchYouTube(query, 10);

        if (results.length === 0) {
            await bot.editMessageText('😕 No results found. Try a different search.', {
                chat_id: chatId,
                message_id: searchingMsg.message_id
            });
            return;
        }

        // Delete searching message
        await bot.deleteMessage(chatId, searchingMsg.message_id).catch(() => {});

        // Store results in state
        userStates.set(chatId, {
            action: 'awaiting_song_selection',
            results: results,
            currentPage: 0
        });

        // Show first 5 results
        const resultButtons = buttons.getSongResultButtons(results.slice(0, 5), 0);
        
        await bot.sendMessage(chatId, messages.getSongSearchResults(query), {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: resultButtons
            }
        });

    } catch (error) {
        console.error('Song search error:', error);
        await bot.editMessageText('❌ Search failed. Please try again.', {
            chat_id: chatId,
            message_id: searchingMsg.message_id
        });
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
        await bot.sendMessage(chatId, '❌ Session expired. Please search again.');
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

    // Show next results
    const hasMore = endIdx < state.results.length;
    const resultButtons = buttons.getSongResultButtons(pageResults, startIdx, hasMore);

    await bot.editMessageReplyMarkup({
        inline_keyboard: resultButtons
    }, {
        chat_id: chatId,
        message_id: messageId
    });
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
        await bot.sendMessage(chatId, '❌ Session expired. Please search again.');
        return;
    }

    const selectedSong = state.results[songIndex];
    if (!selectedSong) {
        await bot.sendMessage(chatId, '❌ Invalid selection.');
        return;
    }

    // Fetch full video info
    const fetchingMsg = await bot.sendMessage(chatId, '⏳ Fetching song details...', {
        parse_mode: 'HTML'
    });

    try {
        const videoInfo = await ytdlp.getVideoInfo(selectedSong.url);
        
        await bot.deleteMessage(chatId, fetchingMsg.message_id).catch(() => {});

        // Update state with selected song
        userStates.set(chatId, {
            action: 'awaiting_song_audio_quality',
            videoInfo: videoInfo,
            url: selectedSong.url
        });

        // Show audio quality buttons
        const qualityButtons = buttons.getSongAudioQualityButtons();
        
        await bot.sendMessage(chatId, messages.getSongInfo(videoInfo), {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: qualityButtons
            }
        });

    } catch (error) {
        console.error('Song selection error:', error);
        await bot.editMessageText('❌ Failed to fetch song details.', {
            chat_id: chatId,
            message_id: fetchingMsg.message_id
        });
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
    const progressMsg = await bot.sendMessage(chatId, progress.getDownloadingAudio(), {
        parse_mode: 'HTML'
    });

    try {
        // Download audio
        const audioPath = await ytdlp.downloadAudio(state.url, bitrate, chatId);

        // Update progress
        await bot.editMessageText(progress.getProcessing(), {
            chat_id: chatId,
            message_id: progressMsg.message_id,
            parse_mode: 'HTML'
        });

        // Convert to MP3
        const mp3Path = await ffmpegService.convertToMp3(audioPath, bitrate);

        // Uploading
        await bot.editMessageText(progress.getUploading(), {
            chat_id: chatId,
            message_id: progressMsg.message_id,
            parse_mode: 'HTML'
        });

        // Send as document
        await bot.sendDocument(chatId, mp3Path, {
            caption: `🎶 ${state.videoInfo.title}\n\n🎧 Quality: ${bitrate} kbps`,
            parse_mode: 'HTML'
        });

        // Cleanup
        await bot.deleteMessage(chatId, progressMsg.message_id).catch(() => {});
        await bot.sendMessage(chatId, messages.getDownloadSuccess(), {
            parse_mode: 'HTML'
        });

        cleanup.scheduleDelete(audioPath);
        cleanup.scheduleDelete(mp3Path);

        userStates.delete(chatId);

        // Show main menu
        const menuHandler = require('./menu');
        await menuHandler.showMainMenu(bot, chatId, userId);

    } catch (error) {
        console.error('Song download error:', error);
        await bot.editMessageText('❌ Download failed. Please try again.', {
            chat_id: chatId,
            message_id: progressMsg.message_id
        });
        userStates.delete(chatId);
    }
}

module.exports = {
    initiateSongSearch,
    processSongSearch,
    showMoreResults,
    handleSongSelection,
    handleSongAudioQuality
};