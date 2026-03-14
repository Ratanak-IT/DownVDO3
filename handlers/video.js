/**
 * 🎬 Video Handler
 */

const fs       = require('fs');
const ytdlp    = require('../services/ytdlp');
const cleanup  = require('../services/cleanup');
const buttons  = require('../utils/buttons');
const progress = require('../utils/progress');
const { getUserLang, t } = require('../utils/lang');
const messages = require('../utils/messages');

async function initiateVideoDownload(bot, chatId, userStates) {
    const lang = getUserLang(chatId);
    userStates.set(chatId, { action: 'awaiting_video_url' });
    await bot.sendMessage(chatId, t('ask_video_url', lang), {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buttons.getCancelButton(lang) }
    });
}

async function processVideoUrl(bot, msg, userStates) {
    const chatId = msg.chat.id;
    const url    = msg.text.trim();
    const lang   = getUserLang(msg.from.id);

    if (!ytdlp.isValidYouTubeUrl(url)) {
        await bot.sendMessage(chatId, t('invalid_url', lang), { parse_mode: 'HTML' });
        return;
    }

    const fetchingMsg = await bot.sendMessage(chatId, t('fetching_video', lang), { parse_mode: 'HTML' });

    try {
        const videoInfo = await ytdlp.getVideoInfo(url);
        await progress.safeDeleteMessage(bot, chatId, fetchingMsg.message_id);

        userStates.set(chatId, { action: 'awaiting_video_quality', videoInfo, url });

        const caption = messages.getVideoInfo(videoInfo) + `\n\n${t('select_video_quality', lang)}`;
        await bot.sendPhoto(chatId, videoInfo.thumbnail, {
            caption,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: buttons.getVideoQualityButtons(videoInfo.formats, lang) }
        });
    } catch (error) {
        console.error('Video info error:', error);
        await progress.safeEditMessage(bot, chatId, fetchingMsg.message_id, t('error_generic', lang));
        userStates.delete(chatId);
    }
}

async function handleQualitySelection(bot, query, userStates) {
    const chatId  = query.message.chat.id;
    const userId  = query.from.id;
    const quality = query.data.replace('vq_', '');
    const state   = userStates.get(chatId);
    const lang    = getUserLang(userId);

    if (!state || !state.url) {
        await bot.sendMessage(chatId, t('session_expired', lang)); return;
    }

    const progressMsg = await bot.sendMessage(chatId, t('downloading_video', lang), { parse_mode: 'HTML' });

    try {
        const filePath = await ytdlp.downloadVideo(state.url, quality, chatId);
        await progress.safeEditMessage(bot, chatId, progressMsg.message_id, t('processing', lang));
        await sleep(500);
        await progress.safeEditMessage(bot, chatId, progressMsg.message_id, t('uploading', lang));

        if (!fs.existsSync(filePath)) throw new Error('File not found');

        await bot.sendDocument(chatId, filePath, {
            caption: `🎬 ${state.videoInfo.title}\n\n📊 Quality: ${quality}`,
            parse_mode: 'HTML'
        });

        await progress.safeDeleteMessage(bot, chatId, progressMsg.message_id);
        await bot.sendMessage(chatId, t('download_success', lang), { parse_mode: 'HTML' });
        cleanup.scheduleDelete(filePath);
        userStates.delete(chatId);

        const menuHandler = require('./menu');
        await menuHandler.showMainMenu(bot, chatId, userId);
    } catch (error) {
        console.error('Video download error:', error);
        await progress.safeEditMessage(bot, chatId, progressMsg.message_id,
            `❌ ${error.message || t('error_generic', lang)}`);
        userStates.delete(chatId);
    }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = { initiateVideoDownload, processVideoUrl, handleQualitySelection };