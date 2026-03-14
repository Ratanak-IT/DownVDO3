/**
 * 🎵 TikTok Handler
 * Video (no watermark) + MP3
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

// ── Step 1: Show TikTok submenu ────────────────────────────────────────────────

async function initiateTikTok(bot, chatId, userStates) {
    const lang = getUserLang(chatId);
    userStates.set(chatId, { action: 'awaiting_tiktok_type' });
    await bot.sendMessage(chatId, t('tiktok_choose_type', lang), {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: t('btn_tiktok_video', lang), callback_data: 'tiktok_video' }],
                [{ text: t('btn_tiktok_mp3',   lang), callback_data: 'tiktok_mp3'   }],
                [{ text: t('btn_cancel',        lang), callback_data: 'cancel'       }],
            ]
        }
    });
}

// ── Step 2: Ask for URL ────────────────────────────────────────────────────────

async function askTikTokUrl(bot, chatId, type, userStates) {
    const lang = getUserLang(chatId);
    userStates.set(chatId, { action: type === 'video' ? 'awaiting_tiktok_video_url' : 'awaiting_tiktok_mp3_url' });
    const key = type === 'video' ? 'ask_tiktok_video_url' : 'ask_tiktok_mp3_url';
    await bot.sendMessage(chatId, t(key, lang), {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buttons.getCancelButton(lang) }
    });
}

// ── Step 3a: Process TikTok Video URL ─────────────────────────────────────────

async function processTikTokVideoUrl(bot, msg, userStates) {
    const chatId = msg.chat.id;
    const url    = msg.text.trim();
    const lang   = getUserLang(msg.from.id);

    if (!ytdlp.isValidTikTokUrl(url)) {
        await bot.sendMessage(chatId, t('invalid_tiktok_url', lang), { parse_mode: 'HTML' });
        return;
    }

    const fetchingMsg = await bot.sendMessage(chatId, t('fetching_video', lang), { parse_mode: 'HTML' });

    try {
        const videoInfo = await ytdlp.getVideoInfo(url);
        await progress.safeDeleteMessage(bot, chatId, fetchingMsg.message_id);

        userStates.set(chatId, { action: 'awaiting_tiktok_video_quality', videoInfo, url });

        const caption = `🎵 <b>TikTok</b>\n\n` + messages.getVideoInfo(videoInfo) + `\n\n${t('select_video_quality', lang)}`;

        if (videoInfo.thumbnail) {
            await bot.sendPhoto(chatId, videoInfo.thumbnail, {
                caption, parse_mode: 'HTML',
                reply_markup: { inline_keyboard: buttons.getTikTokVideoQualityButtons(videoInfo.formats, lang) }
            });
        } else {
            await bot.sendMessage(chatId, caption, {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: buttons.getTikTokVideoQualityButtons(videoInfo.formats, lang) }
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

// ── Step 3b: Process TikTok MP3 URL ───────────────────────────────────────────

async function processTikTokMp3Url(bot, msg, userStates) {
    const chatId = msg.chat.id;
    const url    = msg.text.trim();
    const lang   = getUserLang(msg.from.id);

    if (!ytdlp.isValidTikTokUrl(url)) {
        await bot.sendMessage(chatId, t('invalid_tiktok_url', lang), { parse_mode: 'HTML' });
        return;
    }

    const fetchingMsg = await bot.sendMessage(chatId, t('fetching_audio', lang), { parse_mode: 'HTML' });

    try {
        const videoInfo = await ytdlp.getVideoInfo(url);
        await progress.safeDeleteMessage(bot, chatId, fetchingMsg.message_id);

        userStates.set(chatId, { action: 'awaiting_tiktok_mp3_quality', videoInfo, url });

        const caption = `🎵 <b>TikTok</b>\n\n` + messages.getAudioInfo(videoInfo) + `\n\n${t('select_audio_quality', lang)}`;

        if (videoInfo.thumbnail) {
            await bot.sendPhoto(chatId, videoInfo.thumbnail, {
                caption, parse_mode: 'HTML',
                reply_markup: { inline_keyboard: buttons.getTikTokAudioQualityButtons(lang) }
            });
        } else {
            await bot.sendMessage(chatId, caption, {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: buttons.getTikTokAudioQualityButtons(lang) }
            });
        }
    } catch (error) {
        console.error('TikTok mp3 info error:', error);
        const errMsg = lang === 'km'
            ? `❌ មិនអាចទាញព័ត៌មាន TikTok បានទេ: ${error.message || 'Unknown error'}`
            : `❌ Could not fetch TikTok info: ${error.message || 'Unknown error'}`;
        await progress.safeEditMessage(bot, chatId, fetchingMsg.message_id, errMsg);
        userStates.delete(chatId);
    }
}

// ── Step 4a: Handle TikTok Video Quality ──────────────────────────────────────

async function handleTikTokVideoQuality(bot, query, userStates) {
    const chatId  = query.message.chat.id;
    const userId  = query.from.id;
    const quality = query.data.replace('tvq_', '');
    const state   = userStates.get(chatId);
    const lang    = getUserLang(userId);

    if (!state || !state.url) {
        await bot.sendMessage(chatId, t('session_expired', lang)); return;
    }

    const progressMsg = await bot.sendMessage(chatId, t('downloading_video', lang), { parse_mode: 'HTML' });

    try {
        const filePath = await ytdlp.downloadVideo(state.url, quality, chatId);
        await progress.safeEditMessage(bot, chatId, progressMsg.message_id, t('uploading', lang));

        if (!fs.existsSync(filePath)) throw new Error('File not found on disk');

        const stats  = fs.statSync(filePath);
        const sizeMB = stats.size / (1024 * 1024);

        if (sizeMB > 49) {
            fs.unlinkSync(filePath);
            await progress.safeEditMessage(bot, chatId, progressMsg.message_id,
                lang === 'km'
                    ? `❌ ឯកសារធំពេក (${sizeMB.toFixed(1)}MB)។ Telegram អនុញ្ញាតតែ 50MB។`
                    : `❌ File too large (${sizeMB.toFixed(1)}MB). Max 50MB.`
            );
            userStates.delete(chatId); return;
        }

        await bot.sendDocument(chatId, filePath, {
            caption: `🎵 TikTok: ${state.videoInfo.title}\n\n📊 Quality: ${quality} | 📦 Size: ${sizeMB.toFixed(1)}MB\n🚫 No Watermark`,
            parse_mode: 'HTML'
        });

        await progress.safeDeleteMessage(bot, chatId, progressMsg.message_id);
        await bot.sendMessage(chatId, t('download_success', lang), { parse_mode: 'HTML' });

        admin.incVideo();
        admin.incrementUserDownload(userId);
        cleanup.scheduleDelete(filePath);
        userStates.delete(chatId);

        const menuHandler = require('./menu');
        await menuHandler.showMainMenu(bot, chatId, userId);

    } catch (error) {
        console.error('TikTok video download error:', error);
        await progress.safeEditMessage(bot, chatId, progressMsg.message_id,
            lang === 'km'
                ? `❌ Download បរាជ័យ: ${error.message || 'Unknown error'}`
                : `❌ Download failed: ${error.message || 'Unknown error'}`
        );
        admin.incFailed();
        userStates.delete(chatId);
    }
}

// ── Step 4b: Handle TikTok MP3 Quality ────────────────────────────────────────

async function handleTikTokMp3Quality(bot, query, userStates) {
    const chatId  = query.message.chat.id;
    const userId  = query.from.id;
    const bitrate = query.data.replace('taq_', '');
    const state   = userStates.get(chatId);
    const lang    = getUserLang(userId);

    if (!state || !state.url) {
        await bot.sendMessage(chatId, t('session_expired', lang)); return;
    }

    const progressMsg = await bot.sendMessage(chatId, t('downloading_audio', lang), { parse_mode: 'HTML' });
    let audioPath = null;
    let mp3Path   = null;

    try {
        audioPath = await ytdlp.downloadAudio(state.url, bitrate, chatId);
        if (!audioPath || !fs.existsSync(audioPath)) throw new Error('Audio file not found after download');

        await progress.safeEditMessage(bot, chatId, progressMsg.message_id, t('processing', lang));
        mp3Path = await ffmpegService.convertToMp3(audioPath, bitrate);

        await progress.safeEditMessage(bot, chatId, progressMsg.message_id, t('uploading', lang));

        const finalPath = mp3Path || audioPath;
        if (!fs.existsSync(finalPath)) throw new Error('MP3 file not found after conversion');

        const stats  = fs.statSync(finalPath);
        const sizeMB = stats.size / (1024 * 1024);

        if (sizeMB > 49) {
            fs.unlinkSync(finalPath);
            await progress.safeEditMessage(bot, chatId, progressMsg.message_id,
                lang === 'km'
                    ? `❌ ឯកសារធំពេក (${sizeMB.toFixed(1)}MB)។ Telegram អនុញ្ញាតតែ 50MB។`
                    : `❌ File too large (${sizeMB.toFixed(1)}MB). Max 50MB.`
            );
            userStates.delete(chatId); return;
        }

        await bot.sendDocument(chatId, finalPath, {
            caption: `🎵 TikTok: ${state.videoInfo.title}\n\n🎧 Bitrate: ${bitrate} kbps | 📦 Size: ${sizeMB.toFixed(1)}MB`,
            parse_mode: 'HTML'
        });

        await progress.safeDeleteMessage(bot, chatId, progressMsg.message_id);
        await bot.sendMessage(chatId, t('download_success', lang), { parse_mode: 'HTML' });

        admin.incAudio();
        admin.incrementUserDownload(userId);

        if (audioPath && audioPath !== mp3Path && fs.existsSync(audioPath)) cleanup.scheduleDelete(audioPath);
        if (mp3Path && fs.existsSync(mp3Path)) cleanup.scheduleDelete(mp3Path);

        userStates.delete(chatId);

        const menuHandler = require('./menu');
        await menuHandler.showMainMenu(bot, chatId, userId);

    } catch (error) {
        console.error('TikTok mp3 download error:', error);
        await progress.safeEditMessage(bot, chatId, progressMsg.message_id,
            lang === 'km'
                ? `❌ Download MP3 បរាជ័យ: ${error.message || 'Unknown error'}`
                : `❌ MP3 download failed: ${error.message || 'Unknown error'}`
        );
        admin.incFailed();
        if (audioPath && fs.existsSync(audioPath)) cleanup.scheduleDelete(audioPath);
        if (mp3Path   && fs.existsSync(mp3Path))   cleanup.scheduleDelete(mp3Path);
        userStates.delete(chatId);
    }
}

module.exports = {
    initiateTikTok,
    askTikTokUrl,
    processTikTokVideoUrl,
    processTikTokMp3Url,
    handleTikTokVideoQuality,
    handleTikTokMp3Quality,
};