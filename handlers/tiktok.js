/**
 * 🎵 TikTok Handler
 * Video (auto download, no watermark) + MP3
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
    const action = type === 'video' ? 'awaiting_tiktok_video_url' : 'awaiting_tiktok_mp3_url';
    const key    = type === 'video' ? 'ask_tiktok_video_url'      : 'ask_tiktok_mp3_url';
    userStates.set(chatId, { action });
    await bot.sendMessage(chatId, t(key, lang), {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buttons.getCancelButton(lang) }
    });
}

// ── Step 3a: Process TikTok Video URL — AUTO DOWNLOAD, no quality prompt ───────

async function processTikTokVideoUrl(bot, msg, userStates) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const url    = msg.text.trim();
    const lang   = getUserLang(userId);

    if (!ytdlp.isValidTikTokUrl(url)) {
        await bot.sendMessage(chatId, t('invalid_tiktok_url', lang), { parse_mode: 'HTML' });
        return;
    }

    // Clear state right away — no quality selection step
    userStates.delete(chatId);

    const progressMsg = await bot.sendMessage(chatId, t('downloading_video', lang), { parse_mode: 'HTML' });

    try {
        // Skip getVideoInfo — download directly at best quality
        const filePath = await ytdlp.downloadTikTokVideo(url, chatId);

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
            return;
        }

        await bot.sendDocument(chatId, filePath, {
            caption: `🎵 <b>TikTok Video</b>\n\n📦 Size: ${sizeMB.toFixed(1)}MB | 🚫 No Watermark`,
            parse_mode: 'HTML'
        });

        await progress.safeDeleteMessage(bot, chatId, progressMsg.message_id);
        await bot.sendMessage(chatId, t('download_success', lang), { parse_mode: 'HTML' });

        admin.incVideo();
        admin.incrementUserDownload(userId);
        cleanup.scheduleDelete(filePath);

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
    }
}

// ── Step 3b: Process TikTok MP3 URL — AUTO DOWNLOAD 128kbps, no quality prompt ─

async function processTikTokMp3Url(bot, msg, userStates) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const url    = msg.text.trim();
    const lang   = getUserLang(userId);

    if (!ytdlp.isValidTikTokUrl(url)) {
        await bot.sendMessage(chatId, t('invalid_tiktok_url', lang), { parse_mode: 'HTML' });
        return;
    }

    // Clear state — no quality selection needed
    userStates.delete(chatId);

    const progressMsg = await bot.sendMessage(chatId, t('downloading_audio', lang), { parse_mode: 'HTML' });
    let audioPath = null;
    let mp3Path   = null;

    try {
        // Auto download best audio at 128kbps — skip getVideoInfo entirely
        audioPath = await ytdlp.downloadAudio(url, '128', chatId);
        if (!audioPath || !fs.existsSync(audioPath)) throw new Error('Audio file not found after download');

        await progress.safeEditMessage(bot, chatId, progressMsg.message_id, t('processing', lang));
        mp3Path = await ffmpegService.convertToMp3(audioPath, '128');

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
            return;
        }

        await bot.sendDocument(chatId, finalPath, {
            caption: `🎵 <b>TikTok MP3</b>

📦 Size: ${sizeMB.toFixed(1)}MB`,
            parse_mode: 'HTML'
        });

        await progress.safeDeleteMessage(bot, chatId, progressMsg.message_id);
        await bot.sendMessage(chatId, t('download_success', lang), { parse_mode: 'HTML' });

        admin.incAudio();
        admin.incrementUserDownload(userId);

        if (audioPath && audioPath !== mp3Path && fs.existsSync(audioPath)) cleanup.scheduleDelete(audioPath);
        if (mp3Path && fs.existsSync(mp3Path)) cleanup.scheduleDelete(mp3Path);

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
    }
}

module.exports = {
    initiateTikTok,
    askTikTokUrl,
    processTikTokVideoUrl,
    processTikTokMp3Url,
};