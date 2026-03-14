/**
 * 🎵 Audio Handler — YouTube + TikTok
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

    // Auto-detect platform
    const platform = ytdlp.detectPlatform(url);

    if (!platform) {
        await bot.sendMessage(chatId, t('invalid_url', lang), { parse_mode: 'HTML' });
        return;
    }

    const fetchingMsg = await bot.sendMessage(chatId, t('fetching_audio', lang), {
        parse_mode: 'HTML'
    });

    try {
        const videoInfo = await ytdlp.getVideoInfo(url);
        await progress.safeDeleteMessage(bot, chatId, fetchingMsg.message_id);

        userStates.set(chatId, { action: 'awaiting_audio_quality', videoInfo, url });

        const platformLabel = platform === 'tiktok' ? '🎵 TikTok' : '🎵 YouTube';
        const caption = `${platformLabel}\n\n` + messages.getAudioInfo(videoInfo) + `\n\n${t('select_audio_quality', lang)}`;

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
        console.error('Audio info error:', error);

        let errMsg = '';
        if (error.message && error.message.includes('Private')) {
            errMsg = lang === 'km'
                ? '❌ វីដេអូនេះ Private មិនអាចទាញយកបានទេ។'
                : '❌ This video is Private and cannot be downloaded.';
        } else {
            errMsg = lang === 'km'
                ? `❌ Error: ${error.message || 'មិនអាចទាញព័ត៌មានបានទេ'}`
                : `❌ Error: ${error.message || 'Could not fetch audio info'}`;
        }

        await progress.safeEditMessage(bot, chatId, fetchingMsg.message_id, errMsg);
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
        await bot.sendMessage(chatId, t('session_expired', lang));
        return;
    }

    const progressMsg = await bot.sendMessage(chatId, t('downloading_audio', lang), {
        parse_mode: 'HTML'
    });

    let audioPath = null;
    let mp3Path   = null;

    try {
        audioPath = await ytdlp.downloadAudio(state.url, bitrate, chatId);

        if (!audioPath || !fs.existsSync(audioPath)) {
            throw new Error('Audio file not found after download');
        }

        await progress.safeEditMessage(bot, chatId, progressMsg.message_id, t('processing', lang));
        mp3Path = await ffmpegService.convertToMp3(audioPath, bitrate);

        await progress.safeEditMessage(bot, chatId, progressMsg.message_id, t('uploading', lang));

        const finalPath = mp3Path || audioPath;
        if (!fs.existsSync(finalPath)) throw new Error('MP3 file not found after conversion');

        const stats  = fs.statSync(finalPath);
        const sizeMB = stats.size / (1024 * 1024);

        if (sizeMB > 49) {
            fs.unlinkSync(finalPath);
            const sizeMsg = lang === 'km'
                ? `❌ ឯកសារធំពេក (${sizeMB.toFixed(1)}MB)។ Telegram អនុញ្ញាតតែ 50MB។ សូមជ្រើស bitrate ទាប។`
                : `❌ File too large (${sizeMB.toFixed(1)}MB). Max 50MB. Please choose lower bitrate.`;
            await progress.safeEditMessage(bot, chatId, progressMsg.message_id, sizeMsg);
            userStates.delete(chatId);
            return;
        }

        const platform = ytdlp.detectPlatform(state.url);
        const icon     = platform === 'tiktok' ? '🎵 TikTok' : '🎵 YouTube';

        await bot.sendDocument(chatId, finalPath, {
            caption: `${icon}: ${state.videoInfo.title}\n\n🎧 Bitrate: ${bitrate} kbps | 📦 Size: ${sizeMB.toFixed(1)}MB`,
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
        console.error('Audio download error:', error);

        const errMsg = lang === 'km'
            ? `❌ Download MP3 បរាជ័យ: ${error.message || 'Unknown error'}`
            : `❌ MP3 download failed: ${error.message || 'Unknown error'}`;

        await progress.safeEditMessage(bot, chatId, progressMsg.message_id, errMsg);
        admin.incFailed();

        if (audioPath && fs.existsSync(audioPath)) cleanup.scheduleDelete(audioPath);
        if (mp3Path   && fs.existsSync(mp3Path))   cleanup.scheduleDelete(mp3Path);

        userStates.delete(chatId);
    }
}

module.exports = { initiateAudioDownload, processAudioUrl, handleAudioQuality };