/**
 * 🎬 Video Handler
 */

const fs       = require('fs');
const ytdlp    = require('../services/ytdlp');
const cleanup  = require('../services/cleanup');
const buttons  = require('../utils/buttons');
const progress = require('../utils/progress');
const { getUserLang, t } = require('../utils/lang');
const admin = require('./admin');
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

        // Show detailed error so user knows what went wrong
        let errMsg = '';
        if (error.message && error.message.includes('yt-dlp')) {
            errMsg = lang === 'km'
                ? '❌ yt-dlp មិនដំណើរការ។ សូម contact admin។'
                : '❌ yt-dlp not working. Please contact admin.';
        } else if (error.message && error.message.includes('Private')) {
            errMsg = lang === 'km'
                ? '❌ វីដេអូនេះ Private មិនអាចទាញយកបានទេ។'
                : '❌ This video is Private and cannot be downloaded.';
        } else if (error.message && error.message.includes('age')) {
            errMsg = lang === 'km'
                ? '❌ វីដេអូនេះត្រូវការ login។ សូម contact admin ដើម្បីដំឡើង cookies។'
                : '❌ This video requires login. Contact admin to set up cookies.';
        } else {
            errMsg = lang === 'km'
                ? `❌ Error: ${error.message || 'មិនអាចទាញព័ត៌មានបានទេ'}`
                : `❌ Error: ${error.message || 'Could not fetch video info'}`;
        }

        await progress.safeEditMessage(bot, chatId, fetchingMsg.message_id, errMsg);
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

        if (!fs.existsSync(filePath)) throw new Error('Downloaded file not found on disk');

        // Check file size — Telegram limit is 50MB
        const stats   = fs.statSync(filePath);
        const sizeMB  = stats.size / (1024 * 1024);

        if (sizeMB > 49) {
            fs.unlinkSync(filePath);
            const sizeMsg = lang === 'km'
                ? `❌ ឯកសារធំពេក (${sizeMB.toFixed(1)}MB)។ Telegram អនុញ្ញាតតែ 50MB។ សូមជ្រើស quality ទាប (360p ឬ 480p)។`
                : `❌ File too large (${sizeMB.toFixed(1)}MB). Telegram allows max 50MB. Please choose lower quality (360p or 480p).`;
            await progress.safeEditMessage(bot, chatId, progressMsg.message_id, sizeMsg);
            userStates.delete(chatId);
            return;
        }

        await bot.sendDocument(chatId, filePath, {
            caption: `🎬 ${state.videoInfo.title}\n\n📊 Quality: ${quality} | 📦 Size: ${sizeMB.toFixed(1)}MB`,
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
        console.error('Video download error:', error);

        let errMsg = '';
        if (error.message && error.message.includes('50')) {
            errMsg = lang === 'km'
                ? '❌ ឯកសារធំពេក។ សូមជ្រើស quality ទាប (360p ឬ 480p)។'
                : '❌ File too large. Please choose lower quality (360p or 480p).';
        } else if (error.message && error.message.includes('yt-dlp')) {
            errMsg = lang === 'km'
                ? '❌ yt-dlp error។ សូម contact admin។'
                : '❌ yt-dlp error. Please contact admin.';
        } else {
            errMsg = lang === 'km'
                ? `❌ Download បរាជ័យ: ${error.message || 'Unknown error'}`
                : `❌ Download failed: ${error.message || 'Unknown error'}`;
        }

        await progress.safeEditMessage(bot, chatId, progressMsg.message_id, errMsg);
        admin.incFailed();
        userStates.delete(chatId);
    }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = { initiateVideoDownload, processVideoUrl, handleQualitySelection };