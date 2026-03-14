/**
 * 🎬 Video Handler — YouTube + TikTok
 */

const fs       = require('fs');
const ytdlp    = require('../services/ytdlp');
const cleanup  = require('../services/cleanup');
const buttons  = require('../utils/buttons');
const progress = require('../utils/progress');
const { getUserLang, t } = require('../utils/lang');
const admin    = require('./admin');
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

    // Auto-detect platform
    const platform = ytdlp.detectPlatform(url);

    if (!platform) {
        await bot.sendMessage(chatId, t('invalid_url', lang), { parse_mode: 'HTML' });
        return;
    }

    const fetchingMsg = await bot.sendMessage(chatId, t('fetching_video', lang), {
        parse_mode: 'HTML'
    });

    try {
        const videoInfo = await ytdlp.getVideoInfo(url);
        await progress.safeDeleteMessage(bot, chatId, fetchingMsg.message_id);

        userStates.set(chatId, { action: 'awaiting_video_quality', videoInfo, url });

        const platformLabel = platform === 'tiktok' ? '🎵 TikTok' : '🎬 YouTube';
        const caption = `${platformLabel}\n\n` + messages.getVideoInfo(videoInfo) + `\n\n${t('select_video_quality', lang)}`;

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
        console.error('Video info error:', error);

        let errMsg = '';
        if (error.message && error.message.includes('Private')) {
            errMsg = lang === 'km'
                ? '❌ វីដេអូនេះ Private មិនអាចទាញយកបានទេ។'
                : '❌ This video is Private and cannot be downloaded.';
        } else if (error.message && error.message.includes('age')) {
            errMsg = lang === 'km'
                ? '❌ វីដេអូនេះត្រូវការ login។ សូម contact admin។'
                : '❌ This video requires login. Contact admin.';
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
        await bot.sendMessage(chatId, t('session_expired', lang));
        return;
    }

    const progressMsg = await bot.sendMessage(chatId, t('downloading_video', lang), {
        parse_mode: 'HTML'
    });

    try {
        const filePath = await ytdlp.downloadVideo(state.url, quality, chatId);

        await progress.safeEditMessage(bot, chatId, progressMsg.message_id, t('uploading', lang));

        if (!fs.existsSync(filePath)) throw new Error('Downloaded file not found on disk');

        const stats  = fs.statSync(filePath);
        const sizeMB = stats.size / (1024 * 1024);

        if (sizeMB > 49) {
            fs.unlinkSync(filePath);
            const sizeMsg = lang === 'km'
                ? `❌ ឯកសារធំពេក (${sizeMB.toFixed(1)}MB)។ Telegram អនុញ្ញាតតែ 50MB។ សូមជ្រើស quality ទាប។`
                : `❌ File too large (${sizeMB.toFixed(1)}MB). Max 50MB. Please choose lower quality.`;
            await progress.safeEditMessage(bot, chatId, progressMsg.message_id, sizeMsg);
            userStates.delete(chatId);
            return;
        }

        const platform = ytdlp.detectPlatform(state.url);
        const icon     = platform === 'tiktok' ? '🎵' : '🎬';

        await bot.sendDocument(chatId, filePath, {
            caption: `${icon} ${state.videoInfo.title}\n\n📊 Quality: ${quality} | 📦 Size: ${sizeMB.toFixed(1)}MB`,
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

        const errMsg = lang === 'km'
            ? `❌ Download បរាជ័យ: ${error.message || 'Unknown error'}`
            : `❌ Download failed: ${error.message || 'Unknown error'}`;

        await progress.safeEditMessage(bot, chatId, progressMsg.message_id, errMsg);
        admin.incFailed();
        userStates.delete(chatId);
    }
}

module.exports = { initiateVideoDownload, processVideoUrl, handleQualitySelection };