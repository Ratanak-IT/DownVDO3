/**
 * 🎬 Telegram YouTube Downloader Bot
 * Main Entry Point
 * 
 * This bot allows users to download YouTube videos, audio,
 * search songs, and fetch thumbnails via Telegram.
 */

const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

// Import configurations
const config = require('./config/env');
const { isOwner } = require('./config/owner');

// Import handlers
const startHandler = require('./handlers/start');
const menuHandler = require('./handlers/menu');
const videoHandler = require('./handlers/video');
const audioHandler = require('./handlers/audio');
const songHandler = require('./handlers/song');
const thumbnailHandler = require('./handlers/thumbnail');
const settingsHandler = require('./handlers/settings');
const aboutHandler = require('./handlers/about');

// Import services
const cleanupService = require('./services/cleanup');

// Ensure downloads directory exists
const downloadsDir = path.resolve(config.DOWNLOAD_PATH);
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
    console.log('📁 Created downloads directory');
}

// Initialize bot with polling
const bot = new TelegramBot(config.BOT_TOKEN, { polling: true });

// Store user states for conversation flow
const userStates = new Map();

// Export bot and states for use in handlers
module.exports = { bot, userStates };

/**
 * 🎯 Command: /start
 * Welcomes user and shows main menu
 */
bot.onText(/\/start/, (msg) => {
    startHandler.handleStart(bot, msg, userStates);
});

/**
 * 📱 Callback Query Handler
 * Handles all inline button clicks
 */
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    try {
        // Acknowledge the callback
        await bot.answerCallbackQuery(query.id);

        // Route to appropriate handler based on callback data
        if (data === 'main_menu') {
            menuHandler.showMainMenu(bot, chatId, userId);
        }
        // Video Download Flow
        else if (data === 'video_download') {
            videoHandler.initiateVideoDownload(bot, chatId, userStates);
        }
        else if (data.startsWith('vq_')) {
            videoHandler.handleQualitySelection(bot, query, userStates);
        }
        // Audio Download Flow
        else if (data === 'audio_download') {
            audioHandler.initiateAudioDownload(bot, chatId, userStates);
        }
        else if (data.startsWith('aq_')) {
            audioHandler.handleAudioQuality(bot, query, userStates);
        }
        // Song Search Flow
        else if (data === 'song_search') {
            songHandler.initiateSongSearch(bot, chatId, userStates);
        }
        else if (data.startsWith('song_')) {
            songHandler.handleSongSelection(bot, query, userStates);
        }
        else if (data.startsWith('saq_')) {
            songHandler.handleSongAudioQuality(bot, query, userStates);
        }
        else if (data === 'more_results') {
            songHandler.showMoreResults(bot, query, userStates);
        }
        // Thumbnail Flow
        else if (data === 'thumbnail_download') {
            thumbnailHandler.initiateThumbnailDownload(bot, chatId, userStates);
        }
        else if (data.startsWith('thumb_')) {
            thumbnailHandler.handleThumbnailQuality(bot, query, userStates);
        }
        // Settings (Owner Only)
        else if (data === 'settings') {
            if (isOwner(userId)) {
                settingsHandler.showSettings(bot, chatId);
            }
        }
        else if (data.startsWith('autodelete_')) {
            if (isOwner(userId)) {
                settingsHandler.handleAutoDelete(bot, query);
            }
        }
        // About
        else if (data === 'about') {
            aboutHandler.showAbout(bot, chatId);
        }
        // Cancel Action
        else if (data === 'cancel') {
            userStates.delete(chatId);
            menuHandler.showMainMenu(bot, chatId, userId);
        }

    } catch (error) {
        console.error('Callback error:', error);
        bot.sendMessage(chatId, '❌ Something went wrong. Please try again.');
    }
});

/**
 * 💬 Message Handler
 * Handles text messages based on user state
 */
bot.on('message', async (msg) => {
    // Skip commands
    if (msg.text && msg.text.startsWith('/')) return;
    
    const chatId = msg.chat.id;
    const state = userStates.get(chatId);

    if (!state || !msg.text) return;

    try {
        switch (state.action) {
            case 'awaiting_video_url':
                videoHandler.processVideoUrl(bot, msg, userStates);
                break;
            case 'awaiting_audio_url':
                audioHandler.processAudioUrl(bot, msg, userStates);
                break;
            case 'awaiting_song_query':
                songHandler.processSongSearch(bot, msg, userStates);
                break;
            case 'awaiting_thumbnail_url':
                thumbnailHandler.processThumbnailUrl(bot, msg, userStates);
                break;
        }
    } catch (error) {
        console.error('Message handler error:', error);
        bot.sendMessage(chatId, '❌ An error occurred. Please try again.');
    }
});

/**
 * 🧹 Start cleanup service
 */
cleanupService.startCleanupScheduler();

/**
 * 🚀 Bot startup confirmation
 */
console.log('');
console.log('╔════════════════════════════════════════╗');
console.log('║  🎬 YouTube Downloader Bot Started!    ║');
console.log('║  ✅ Bot is running and ready...        ║');
console.log('╚════════════════════════════════════════╝');
console.log('');

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Bot shutting down gracefully...');
    bot.stopPolling();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 Bot shutting down gracefully...');
    bot.stopPolling();
    process.exit(0);
});