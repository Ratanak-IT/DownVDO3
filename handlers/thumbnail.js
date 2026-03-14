const { getUserLang, t } = require('../utils/lang');
/**
 * 🖼️ Thumbnail Handler
 * Manages YouTube thumbnail download flow
 */

const ytdlp = require('../services/ytdlp');
const cleanup = require('../services/cleanup');
const messages = require('../utils/messages');
const buttons = require('../utils/buttons');
const progress = require('../utils/progress');
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
    const lang = getUserLang(chatId);
    userStates.set(chatId, { action: 'awaiting_thumbnail_url' });
    await bot.sendMessage(chatId, t('ask_thumbnail_url', lang), {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buttons.getCancelButton(lang) }
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
    const fetchingMsg = await bot.sendMessage(chatId, t('fetching_thumbnail', getUserLang(msg.from.id)), {
        parse_mode: 'HTML'
    });

    try {
        // Get video info
        const videoInfo = await ytdlp.getVideoInfo(url);
        
        // Delete fetching message
        await progress.safeDeleteMessage(bot, chatId, fetchingMsg.message_id);

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
        const qualityButtons = buttons.getThumbnailQualityButtons(getUserLang(msg.from.id));
        
        await bot.sendPhoto(chatId, thumbnails.high, {
            caption: messages.getThumbnailInfo(videoInfo),
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: qualityButtons
            }
        });

    } catch (error) {
        console.error('Thumbnail info error:', error);
        await progress.safeEditMessage(
            bot,
            chatId,
            fetchingMsg.message_id,
            t('error_generic', getUserLang(msg.from.id))
        );
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
        
        const request = protocol.get(url, (response) => {
            // Handle redirects
            if (response.statusCode === 302 || response.statusCode === 301) {
                file.close();
                fs.unlink(filePath, () => {});
                downloadImage(response.headers.location, filePath)
                    .then(resolve)
                    .catch(reject);
                return;
            }
            
            if (response.statusCode !== 200) {
                file.close();
                fs.unlink(filePath, () => {});
                reject(new Error(`Failed to download: ${response.statusCode}`));
                return;
            }
            
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve(filePath);
            });
        });

        request.on('error', (err) => {
            file.close();
            fs.unlink(filePath, () => {});
            reject(err);
        });

        // Set timeout
        request.setTimeout(30000, () => {
            request.destroy();
            file.close();
            fs.unlink(filePath, () => {});
            reject(new Error('Download timeout'));
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
        await bot.sendMessage(chatId, t('session_expired', getUserLang(query.from.id)));
        return;
    }

    const thumbnailUrl = state.thumbnails[quality];
    if (!thumbnailUrl) {
        await bot.sendMessage(chatId, '❌ Invalid quality selection.');
        return;
    }

    // Send downloading message
    const progressMsg = await bot.sendMessage(chatId, t('downloading_thumb', getUserLang(query.from.id)), {
        parse_mode: 'HTML'
    });

    try {
        // Ensure downloads directory exists
        if (!fs.existsSync(config.DOWNLOAD_PATH)) {
            fs.mkdirSync(config.DOWNLOAD_PATH, { recursive: true });
        }

        // Download thumbnail
        const fileName = `thumb_${state.videoId}_${quality}_${uuidv4()}.jpg`;
        const filePath = path.join(config.DOWNLOAD_PATH, fileName);
        
        await downloadImage(thumbnailUrl, filePath);

        // Check if maxres is available (fallback to hq if not)
        const stats = fs.statSync(filePath);
        if (quality === 'max' && stats.size < 1000) {
            fs.unlinkSync(filePath);
            await downloadImage(state.thumbnails.high, filePath);
            
            await bot.sendMessage(chatId, t('thumb_not_max', getUserLang(query.from.id)), {
                parse_mode: 'HTML'
            });
        }

        // Update progress
        await progress.safeEditMessage(
            bot,
            chatId,
            progressMsg.message_id,
            t('uploading_thumb', getUserLang(query.from.id))
        );

        // Send as document
        await bot.sendDocument(chatId, filePath, {
            caption: `🖼️ ${state.videoInfo.title}\n\n📐 Quality: ${quality.toUpperCase()}`,
            parse_mode: 'HTML'
        });

        // Cleanup
        await progress.safeDeleteMessage(bot, chatId, progressMsg.message_id);
        
        await bot.sendMessage(chatId, t('download_success', getUserLang(query.from.id)), {
            parse_mode: 'HTML'
        });

        cleanup.scheduleDelete(filePath);
        userStates.delete(chatId);

        // Show main menu
        const menuHandler = require('./menu');
        await menuHandler.showMainMenu(bot, chatId, userId);

    } catch (error) {
        console.error('Thumbnail download error:', error);
        await progress.safeEditMessage(
            bot,
            chatId,
            progressMsg.message_id,
            `❌ Failed to download thumbnail: ${error.message || 'Unknown error'}`
        );
        userStates.delete(chatId);
    }
}

module.exports = {
    initiateThumbnailDownload,
    processThumbnailUrl,
    handleThumbnailQuality
};