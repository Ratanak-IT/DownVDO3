/**
 * 🖼️ Thumbnail Handler
 * Manages YouTube thumbnail download flow
 */

const ytdlp = require('../services/ytdlp');
const cleanup = require('../services/cleanup');
const messages = require('../utils/messages');
const buttons = require('../utils/buttons');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const config = require('../config/env');
const { v4: uuidv4 } = require('uuid');

/**
 * Initiate thumbnail download flow
 * @param {TelegramBot} bot 
 * @param {number} chatId 
 * @param {Map} userStates 
 */
async function initiateThumbnailDownload(bot, chatId, userStates) {
    userStates.set(chatId, { action: 'awaiting_thumbnail_url' });
    
    await bot.sendMessage(chatId, messages.getAskThumbnailUrl(), {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: buttons.getCancelButton()
        }
    });
}

/**
 * Process thumbnail URL
 * @param {TelegramBot} bot 
 * @param {Message} msg 
 * @param {Map} userStates 
 */
async function processThumbnailUrl(bot, msg, userStates) {
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
    const fetchingMsg = await bot.sendMessage(chatId, '⏳ Fetching thumbnail options...', {
        parse_mode: 'HTML'
    });

    try {
        // Get video info
        const videoInfo = await ytdlp.getVideoInfo(url);
        
        // Delete fetching message
        await bot.deleteMessage(chatId, fetchingMsg.message_id).catch(() => {});

        // Generate thumbnail URLs for different qualities
        const videoId = ytdlp.extractVideoId(url);
        const thumbnails = {
            default: `https://img.youtube.com/vi/${videoId}/default.jpg`,
            medium: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
            high: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            max: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
        };

        // Store in state
        userStates.set(chatId, {
            action: 'awaiting_thumbnail_quality',
            videoInfo: videoInfo,
            thumbnails: thumbnails,
            videoId: videoId
        });

        // Send preview with quality buttons
        const qualityButtons = buttons.getThumbnailQualityButtons();
        
        await bot.sendPhoto(chatId, thumbnails.high, {
            caption: messages.getThumbnailInfo(videoInfo),
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: qualityButtons
            }
        });

    } catch (error) {
        console.error('Thumbnail info error:', error);
        await bot.editMessageText('❌ Failed to fetch thumbnail. Please check the URL.', {
            chat_id: chatId,
            message_id: fetchingMsg.message_id
        });
        userStates.delete(chatId);
    }
}

/**
 * Download image from URL
 * @param {string} url 
 * @param {string} filePath 
 * @returns {Promise<string>}
 */
function downloadImage(url, filePath) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const file = fs.createWriteStream(filePath);
        
        protocol.get(url, (response) => {
            // Handle redirects
            if (response.statusCode === 302 || response.statusCode === 301) {
                downloadImage(response.headers.location, filePath)
                    .then(resolve)
                    .catch(reject);
                return;
            }
            
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download: ${response.statusCode}`));
                return;
            }
            
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve(filePath);
            });
        }).on('error', (err) => {
            fs.unlink(filePath, () => {});
            reject(err);
        });
    });
}

/**
 * Handle thumbnail quality selection
 * @param {TelegramBot} bot 
 * @param {CallbackQuery} query 
 * @param {Map} userStates 
 */
async function handleThumbnailQuality(bot, query, userStates) {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const quality = query.data.replace('thumb_', '');
    const state = userStates.get(chatId);

    if (!state || !state.thumbnails) {
        await bot.sendMessage(chatId, '❌ Session expired. Please start again.');
        return;
    }

    const thumbnailUrl = state.thumbnails[quality];
    if (!thumbnailUrl) {
        await bot.sendMessage(chatId, '❌ Invalid quality selection.');
        return;
    }

    // Send downloading message
    const progressMsg = await bot.sendMessage(chatId, '⏳ Downloading thumbnail...', {
        parse_mode: 'HTML'
    });

    try {
        // Download thumbnail
        const fileName = `thumb_${state.videoId}_${quality}_${uuidv4()}.jpg`;
        const filePath = path.join(config.DOWNLOAD_PATH, fileName);
        
        await downloadImage(thumbnailUrl, filePath);

        // Check if maxres is available (fallback to hq if not)
        if (quality === 'max' && fs.statSync(filePath).size < 1000) {
            fs.unlinkSync(filePath);
            await downloadImage(state.thumbnails.high, filePath);
            await bot.sendMessage(chatId, '📝 Max resolution not available, using high quality.', {
                parse_mode: 'HTML'
            });
        }

        // Update progress
        await bot.editMessageText('📤 Uploading thumbnail...', {
            chat_id: chatId,
            message_id: progressMsg.message_id,
            parse_mode: 'HTML'
        });

        // Send as document
        await bot.sendDocument(chatId, filePath, {
            caption: `🖼️ ${state.videoInfo.title}\n\n📐 Quality: ${quality.toUpperCase()}`,
            parse_mode: 'HTML'
        });

        // Cleanup
        await bot.deleteMessage(chatId, progressMsg.message_id).catch(() => {});
        await bot.sendMessage(chatId, messages.getDownloadSuccess(), {
            parse_mode: 'HTML'
        });

        cleanup.scheduleDelete(filePath);
        userStates.delete(chatId);

        // Show main menu
        const menuHandler = require('./menu');
        await menuHandler.showMainMenu(bot, chatId, userId);

    } catch (error) {
        console.error('Thumbnail download error:', error);
        await bot.editMessageText('❌ Failed to download thumbnail.', {
            chat_id: chatId,
            message_id: progressMsg.message_id
        });
        userStates.delete(chatId);
    }
}

module.exports = {
    initiateThumbnailDownload,
    processThumbnailUrl,
    handleThumbnailQuality
};