/**
 * 🎵 TikTok Handler
 * Auto-detected when user sends a TikTok URL in video or audio flow
 */

const fs            = require('fs');
const ytdlp         = require('../services/ytdlp');
const ffmpegService = require('../services/ffmpeg');
const cleanup       = require('../services/cleanup');
const buttons       = require('../utils/buttons');
const progress      = require('../utils/progress');
const { getUserLang, t } = require('../utils/lang');
const admin         = require('./admin');
const messages      = require('../utils/messages');

// ── Video ──────────────────────────────────────────────────────────────────────

async function processTikTokVideoUrl(bot, msg, userStates) {
    const chatId = msg.chat.id;
    const url    = msg.text.trim();
    const lang   = getUserLang(msg.from.id);

    const fetchingMsg = await bot.sendMessage(chatId, t('fetching_video', lang), {
        parse_mode: 'HTML'
    });

    try {
        const videoInfo = await ytdlp.getVideoInfo(url);
        await progress.safeDeleteMessage(bot, chatId, fetchingMsg.message_id);

        userStates.set(chatId, { action: 'awaiting_video_quality', videoInfo, url });

        // Show thumbnail if available, else just text
        const caption = messages.getVideoInfo(videoInfo) + `\n\n${t('select_video_quality', lang)}`;

        if (videoInfo.thumbnail) {
            await bot.sendPhoto(chatId, videoInfo.thumbnail, {
                caption,
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: buttons.getVideoQualityButtons(videoInfo.formats, lang) }
            });
        } else {
            await bot.sendMessage(chatId, caption, {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: buttons.getVideoQualityButtons(videoInfo.formats, lang) }
            });
        }
    } catch (error) {
        console.error('TikTok video info error:', error);
        const errMsg = lang === 'km'
            ? `❌ មិនអាចទាញព័ត៌មាន TikTok បានទេ: ${error.message || 'Unknown error'}`
            : `❌ Could not fetch TikTok info: ${error.message || 'Unknown error'}`;
        await progress.safeEditMessage(bot, chatId, fetchingMsg.message_id, errMsg);
        userStates.delete(chatId);
    }
}

// ── Audio ──────────────────────────────────────────────────────────────────────

async function processTikTokAudioUrl(bot, msg, userStates) {
    const chatId = msg.chat.id;
    const url    = msg.text.trim();
    const lang   = getUserLang(msg.from.id);

    const fetchingMsg = await bot.sendMessage(chatId, t('fetching_audio', lang), {
        parse_mode: 'HTML'
    });

    try {
        const videoInfo = await ytdlp.getVideoInfo(url);
        await progress.safeDeleteMessage(bot, chatId, fetchingMsg.message_id);

        userStates.set(chatId, { action: 'awaiting_audio_quality', videoInfo, url });

        const caption = messages.getAudioInfo(videoInfo) + `\n\n${t('select_audio_quality', lang)}`;

        if (videoInfo.thumbnail) {
            await bot.sendPhoto(chatId, videoInfo.thumbnail, {
                caption,
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: buttons.getAudioQualityButtons(lang) }
            });
        } else {
            await bot.sendMessage(chatId, caption, {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: buttons.getAudioQualityButtons(lang) }
            });
        }
    } catch (error) {
        console.error('TikTok audio info error:', error);
        const errMsg = lang === 'km'
            ? `❌ មិនអាចទាញព័ត៌មាន TikTok បានទេ: ${error.message || 'Unknown error'}`
            : `❌ Could not fetch TikTok info: ${error.message || 'Unknown error'}`;
        await progress.safeEditMessage(bot, chatId, fetchingMsg.message_id, errMsg);
        userStates.delete(chatId);
    }
}

module.exports = { processTikTokVideoUrl, processTikTokAudioUrl };