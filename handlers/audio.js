/**
 * 🎵 Audio Handler
 */

const fs           = require('fs');
const ytdlp        = require('../services/ytdlp');
const ffmpegService = require('../services/ffmpeg');
const cleanup      = require('../services/cleanup');
const buttons      = require('../utils/buttons');
const progress     = require('../utils/progress');
const { getUserLang, t } = require('../utils/lang');
const messages     = require('../utils/messages');

async function initiateAudioDownload(bot, chatId, userStates) {
    const lang = getUserLang(chatId);
    userStates.set(chatId, { action: 'awaiting_audio_url' });
    await bot.sendMessage(chatId, t('ask_audio_url', lang), {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buttons.getCancelButton(lang) }
    });
}

async function processAudioUrl(bot, msg, userStates) {
    const chatId = msg.chat.id;
    const url    = msg.text.trim();
    const lang   = getUserLang(msg.from.id);

    if (!ytdlp.isValidYouTubeUrl(url)) {
        await bot.sendMessage(chatId, t('invalid_url', lang), { parse_mode: 'HTML' });
        return;
    }

    const fetchingMsg = await bot.sendMessage(chatId, t('fetching_audio', lang), { parse_mode: 'HTML' });

    try {
        const videoInfo = await ytdlp.getVideoInfo(url);
        await progress.safeDeleteMessage(bot, chatId, fetchingMsg.message_id);
        userStates.set(chatId, { action: 'awaiting_audio_quality', videoInfo, url });

        const caption = messages.getAudioInfo(videoInfo) + `\n\n${t('select_audio_quality', lang)}`;
        await bot.sendPhoto(chatId, videoInfo.thumbnail, {
            caption, parse_mode: 'HTML',
            reply_markup: { inline_keyboard: buttons.getAudioQualityButtons(lang) }
        });
    } catch (error) {
        console.error('Audio info error:', error);
        await progress.safeEditMessage(bot, chatId, fetchingMsg.message_id, t('error_generic', lang));
        userStates.delete(chatId);
    }
}

async function handleAudioQuality(bot, query, userStates) {
    const chatId  = query.message.chat.id;
    const userId  = query.from.id;
    const bitrate = query.data.replace('aq_', '');
    const state   = userStates.get(chatId);
    const lang    = getUserLang(userId);

    if (!state || !state.url) {
        await bot.sendMessage(chatId, t('session_expired', lang)); return;
    }

    const progressMsg = await bot.sendMessage(chatId, t('downloading_audio', lang), { parse_mode: 'HTML' });
    let audioPath = null, mp3Path = null;

    try {
        audioPath = await ytdlp.downloadAudio(state.url, bitrate, chatId);
        await progress.safeEditMessage(bot, chatId, progressMsg.message_id, t('processing', lang));
        await sleep(500);
        mp3Path = await ffmpegService.convertToMp3(audioPath, bitrate);
        await progress.safeEditMessage(bot, chatId, progressMsg.message_id, t('uploading', lang));

        const finalPath = mp3Path || audioPath;
        if (!fs.existsSync(finalPath)) throw new Error('Audio file not found');

        await bot.sendDocument(chatId, finalPath, {
            caption: `🎵 ${state.videoInfo.title}\n\n🎧 Quality: ${bitrate} kbps`,
            parse_mode: 'HTML'
        });

        await progress.safeDeleteMessage(bot, chatId, progressMsg.message_id);
        await bot.sendMessage(chatId, t('download_success', lang), { parse_mode: 'HTML' });
        if (audioPath && audioPath !== mp3Path) cleanup.scheduleDelete(audioPath);
        if (mp3Path) cleanup.scheduleDelete(mp3Path);
        userStates.delete(chatId);

        const menuHandler = require('./menu');
        await menuHandler.showMainMenu(bot, chatId, userId);
    } catch (error) {
        console.error('Audio error:', error);
        await progress.safeEditMessage(bot, chatId, progressMsg.message_id,
            `❌ ${error.message || t('error_generic', lang)}`);
        if (audioPath && fs.existsSync(audioPath)) cleanup.scheduleDelete(audioPath);
        if (mp3Path && fs.existsSync(mp3Path)) cleanup.scheduleDelete(mp3Path);
        userStates.delete(chatId);
    }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = { initiateAudioDownload, processAudioUrl, handleAudioQuality };