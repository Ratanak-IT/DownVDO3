/**
 * 🎬 Telegram YouTube Downloader Bot
 * Main Entry Point — with English & Khmer support
 */

const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const fs   = require('fs');
require('dotenv').config();

const config       = require('./config/env');
const { isOwner }  = require('./config/owner');
const { getUserLang, setUserLang, t } = require('./utils/lang');

const startHandler     = require('./handlers/start');
const menuHandler      = require('./handlers/menu');
const videoHandler     = require('./handlers/video');
const audioHandler     = require('./handlers/audio');
const songHandler      = require('./handlers/song');
const thumbnailHandler = require('./handlers/thumbnail');
const settingsHandler  = require('./handlers/settings');
const aboutHandler     = require('./handlers/about');
const cleanupService   = require('./services/cleanup');
const buttons          = require('./utils/buttons');

// Ensure downloads directory exists
const downloadsDir = path.resolve(config.DOWNLOAD_PATH);
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
    console.log('📁 Created downloads directory');
}

const bot        = new TelegramBot(config.BOT_TOKEN, { polling: true });
const userStates = new Map();

module.exports = { bot, userStates };

// ── /start ─────────────────────────────────────────────────────────────────────
bot.onText(/\/start/, (msg) => {
    startHandler.handleStart(bot, msg, userStates);
});

// ── /language ──────────────────────────────────────────────────────────────────
bot.onText(/\/language/, (msg) => {
    const lang = getUserLang(msg.from.id);
    bot.sendMessage(msg.chat.id, t('choose_language', lang), {
        reply_markup: { inline_keyboard: buttons.getLanguageButtons() }
    });
});

// ── Callback Query ─────────────────────────────────────────────────────────────
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data   = query.data;
    const lang   = getUserLang(userId);

    try {
        await bot.answerCallbackQuery(query.id);

        // ── Language switching ────────────────────────────────────────────────
        if (data === 'set_lang_en') {
            setUserLang(userId, 'en');
            await bot.editMessageText(t('language_set_en', 'en'), {
                chat_id: chatId, message_id: query.message.message_id,
                reply_markup: { inline_keyboard: [
                    [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
                ]}
            });
            return;
        }

        if (data === 'set_lang_km') {
            setUserLang(userId, 'km');
            await bot.editMessageText(t('language_set_km', 'km'), {
                chat_id: chatId, message_id: query.message.message_id,
                reply_markup: { inline_keyboard: [
                    [{ text: '🏠 ម៉ឺនុយ', callback_data: 'main_menu' }]
                ]}
            });
            return;
        }

        // ── Choose language screen ─────────────────────────────────────────────
        if (data === 'choose_language') {
            await bot.editMessageText(t('choose_language', lang), {
                chat_id: chatId, message_id: query.message.message_id,
                reply_markup: { inline_keyboard: buttons.getLanguageButtons() }
            });
            return;
        }

        // ── Main menu ──────────────────────────────────────────────────────────
        if (data === 'main_menu') {
            menuHandler.showMainMenu(bot, chatId, userId);
            return;
        }

        // ── Video ──────────────────────────────────────────────────────────────
        if (data === 'video_download') {
            videoHandler.initiateVideoDownload(bot, chatId, userStates);
        } else if (data.startsWith('vq_')) {
            videoHandler.handleQualitySelection(bot, query, userStates);
        }

        // ── Audio ──────────────────────────────────────────────────────────────
        else if (data === 'audio_download') {
            audioHandler.initiateAudioDownload(bot, chatId, userStates);
        } else if (data.startsWith('aq_')) {
            audioHandler.handleAudioQuality(bot, query, userStates);
        }

        // ── Song ───────────────────────────────────────────────────────────────
        else if (data === 'song_search') {
            songHandler.initiateSongSearch(bot, chatId, userStates);
        } else if (data.startsWith('song_')) {
            songHandler.handleSongSelection(bot, query, userStates);
        } else if (data.startsWith('saq_')) {
            songHandler.handleSongAudioQuality(bot, query, userStates);
        } else if (data === 'more_results') {
            songHandler.showMoreResults(bot, query, userStates);
        }

        // ── Thumbnail ──────────────────────────────────────────────────────────
        else if (data === 'thumbnail_download') {
            thumbnailHandler.initiateThumbnailDownload(bot, chatId, userStates);
        } else if (data.startsWith('thumb_')) {
            thumbnailHandler.handleThumbnailQuality(bot, query, userStates);
        }

        // ── Settings (owner only) ──────────────────────────────────────────────
        else if (data === 'settings') {
            if (isOwner(userId)) settingsHandler.showSettings(bot, chatId, lang);
        } else if (data.startsWith('autodelete_')) {
            if (isOwner(userId)) settingsHandler.handleAutoDelete(bot, query, lang);
        }

        // ── About ──────────────────────────────────────────────────────────────
        else if (data === 'about') {
            aboutHandler.showAbout(bot, chatId, lang);
        }

        // ── Cancel ─────────────────────────────────────────────────────────────
        else if (data === 'cancel') {
            userStates.delete(chatId);
            menuHandler.showMainMenu(bot, chatId, userId);
        }

    } catch (error) {
        console.error('Callback error:', error);
        bot.sendMessage(chatId, t('error_generic', lang));
    }
});

// ── Message Handler ────────────────────────────────────────────────────────────
bot.on('message', async (msg) => {
    if (msg.text && msg.text.startsWith('/')) return;
    const chatId = msg.chat.id;
    const state  = userStates.get(chatId);
    if (!state || !msg.text) return;

    try {
        switch (state.action) {
            case 'awaiting_video_url':
                videoHandler.processVideoUrl(bot, msg, userStates); break;
            case 'awaiting_audio_url':
                audioHandler.processAudioUrl(bot, msg, userStates); break;
            case 'awaiting_song_query':
                songHandler.processSongSearch(bot, msg, userStates); break;
            case 'awaiting_thumbnail_url':
                thumbnailHandler.processThumbnailUrl(bot, msg, userStates); break;
        }
    } catch (error) {
        console.error('Message handler error:', error);
        const lang = getUserLang(msg.from.id);
        bot.sendMessage(chatId, t('error_generic', lang));
    }
});

cleanupService.startCleanupScheduler();

console.log('');
console.log('╔════════════════════════════════════════╗');
console.log('║  🎬 YouTube Downloader Bot Started!    ║');
console.log('║  ✅ Bot is running and ready...        ║');
console.log('╚════════════════════════════════════════╝');
console.log('');

process.on('SIGINT',  () => { bot.stopPolling(); process.exit(0); });
process.on('SIGTERM', () => { bot.stopPolling(); process.exit(0); });