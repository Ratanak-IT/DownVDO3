/**
 * 🎬 Video Handler
 * Manages YouTube video download flow
 */

const path = require('path');
const fs = require('fs');
const ytdlp = require('../services/ytdlp');
const cleanup = require('../services/cleanup');
const messages = require('../utils/messages');
const buttons = require('../utils/buttons');
const progress = require('../utils/progress');
const config = require('../config/env');

/**
 * Initiate video download flow
 * @param {TelegramBot} bot 
 * @param {number} chatId 
 * @param {Map} userStates 
 */
async function initiateVideoDownload(bot, chatId, userStates) {
    userStates.set(chatId, { action: 'awaiting_video_url' });
    
    await bot.sendMessage(chatId, messages.getAskVideoUrl(), {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: buttons.getCancelButton()
        }
    });
}

/**
 * Process video URL sent by user
 * @param {TelegramBot} bot 
 * @param {Message} msg 
 * @param {Map} userStates 
 */
async function processVideoUrl(bot, msg, userStates) {
    const chatId = msg.chat.id;
    const url = msg.text.trim();

    // Validate YouTube URL
    if (!ytdlp.isValidYouTubeUrl(url)) {
        await bot.sendMessage(chatId, messages.getInvalidUrl(), {
            parse_mode: 'HTML'
        });
        return;
    }

    // Send fetching message
    const fetchingMsg = await bot.sendMessage(chatId, '⏳ Fetching video details...', {
        parse_mode: 'HTML'
    });

    try {
        // Get video info
        const videoInfo = await ytdlp.getVideoInfo(url);
        
        // Delete fetching message
        await bot.deleteMessage(chatId, fetchingMsg.message_id).catch(() => {});

        // Store video info in state
        userStates.set(chatId, {
            action: 'awaiting_video_quality',
            videoInfo: videoInfo,
            url: url
        });

        // Send thumbnail with video info
        const infoText = messages.getVideoInfo(videoInfo);
        const qualityButtons = buttons.getVideoQualityButtons(videoInfo.formats);

        await bot.sendPhoto(chatId, videoInfo.thumbnail, {
            caption: infoText,
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: qualityButtons
            }
        });

    } catch (error) {
        console.error('Video info error:', error);
        await bot.editMessageText('❌ Failed to fetch video details. Please check the URL and try again.', {
            chat_id: chatId,
            message_id: fetchingMsg.message_id
        });
        userStates.delete(chatId);
    }
}

/**
 * Handle video quality selection
 * @param {TelegramBot} bot 
 * @param {CallbackQuery} query 
 * @param {Map} userStates 
 */
async function handleQualitySelection(bot, query, userStates) {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const quality = query.data.replace('vq_', '');
    const state = userStates.get(chatId);

    if (!state || !state.url) {
        await bot.sendMessage(chatId, '❌ Session expired. Please start again.');
        return;
    }

    // Send progress messages
    const progressMsg = await bot.sendMessage(chatId, progress.getDownloadingVideo(), {
        parse_mode: 'HTML'
    });

    try {
        // Update progress
        await bot.editMessageText(progress.getDownloadingVideo(), {
            chat_id: chatId,
            message_id: progressMsg.message_id,
            parse_mode: 'HTML'
        });

        // Download video
        const filePath = await ytdlp.downloadVideo(state.url, quality, chatId);

        // Update progress - Processing
        await bot.editMessageText(progress.getProcessing(), {
            chat_id: chatId,
            message_id: progressMsg.message_id,
            parse_mode: 'HTML'
        });

        // Update progress - Uploading
        await bot.editMessageText(progress.getUploading(), {
            chat_id: chatId,
            message_id: progressMsg.message_id,
            parse_mode: 'HTML'
        });

        // Send as document
        await bot.sendDocument(chatId, filePath, {
            caption: `🎬 ${state.videoInfo.title}\n\n📊 Quality: ${quality}`,
            parse_mode: 'HTML'
        });

        // Delete progress message
        await bot.deleteMessage(chatId, progressMsg.message_id).catch(() => {});

        // Success message
        await bot.sendMessage(chatId, messages.getDownloadSuccess(), {
            parse_mode: 'HTML'
        });

        // Schedule file cleanup
        cleanup.scheduleDelete(filePath);

        // Clear state
        userStates.delete(chatId);

        // Show main menu (new message)
        const menuHandler = require('./menu');
        await menuHandler.showMainMenu(bot, chatId, userId);

    } catch (error) {
        console.error('Video download error:', error);
        await bot.editMessageText('❌ Download failed. Please try again later.', {
            chat_id: chatId,
            message_id: progressMsg.message_id
        });
        userStates.delete(chatId);
    }
}

module.exports = {
    initiateVideoDownload,
    processVideoUrl,
    handleQualitySelection
};