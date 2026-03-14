/**
 * 🎬 Telegram YouTube + TikTok Downloader Bot
 * Main Entry Point
 */

const TelegramBot = require('node-telegram-bot-api');
const path  = require('path');
const fs    = require('fs');
require('dotenv').config();

const config         = require('./config/env');
const { isOwner }    = require('./config/owner');
const { getUserLang, setUserLang, t } = require('./utils/lang');

const startHandler     = require('./handlers/start');
const menuHandler      = require('./handlers/menu');
const videoHandler     = require('./handlers/video');
const audioHandler     = require('./handlers/audio');
const songHandler      = require('./handlers/song');
const thumbnailHandler = require('./handlers/thumbnail');
const settingsHandler  = require('./handlers/settings');
const aboutHandler     = require('./handlers/about');
const adminHandler     = require('./handlers/admin');
const tiktokHandler    = require('./handlers/tiktok');
const cleanupService   = require('./services/cleanup');
const buttons          = require('./utils/buttons');

// Ensure folders exist
['downloads', 'data'].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const bot        = new TelegramBot(config.BOT_TOKEN, { polling: true });
const userStates = new Map();
module.exports   = { bot, userStates };

// ── /start ─────────────────────────────────────────────────────────────────────
bot.onText(/\/start/, (msg) => {
    adminHandler.registerUser(msg.from.id, msg.from.first_name, getUserLang(msg.from.id));
    startHandler.handleStart(bot, msg, userStates);
});

// ── /language ──────────────────────────────────────────────────────────────────
bot.onText(/\/language/, (msg) => {
    const lang = getUserLang(msg.from.id);
    bot.sendMessage(msg.chat.id, t('choose_language', lang), {
        reply_markup: { inline_keyboard: buttons.getLanguageButtons() }
    });
});

// ── Admin Commands ─────────────────────────────────────────────────────────────
bot.onText(/\/admin/,          (msg) => adminHandler.adminCommand(bot, msg));
bot.onText(/\/users/,          (msg) => adminHandler.usersCommand(bot, msg));
bot.onText(/\/message(.+)?/,   (msg) => adminHandler.messageCommand(bot, msg));
bot.onText(/\/stats/,          (msg) => adminHandler.statsCommand(bot, msg));
bot.onText(/\/cleardownloads/, (msg) => adminHandler.clearDownloadsCommand(bot, msg));

// ── Callback Query ─────────────────────────────────────────────────────────────
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data   = query.data;
    const lang   = getUserLang(userId);

    try {
        await bot.answerCallbackQuery(query.id);

        // ── Admin ──────────────────────────────────────────────────────────────
        if (data.startsWith('admin_')) {
            await adminHandler.handleAdminCallback(bot, query); return;
        }

        // ── Language ───────────────────────────────────────────────────────────
        if (data === 'set_lang_en') {
            setUserLang(userId, 'en');
            adminHandler.registerUser(userId, query.from.first_name, 'en');
            await bot.editMessageText(t('language_set_en', 'en'), {
                chat_id: chatId, message_id: query.message.message_id,
                reply_markup: { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] }
            }); return;
        }
        if (data === 'set_lang_km') {
            setUserLang(userId, 'km');
            adminHandler.registerUser(userId, query.from.first_name, 'km');
            await bot.editMessageText(t('language_set_km', 'km'), {
                chat_id: chatId, message_id: query.message.message_id,
                reply_markup: { inline_keyboard: [[{ text: '🏠 ម៉ឺនុយ', callback_data: 'main_menu' }]] }
            }); return;
        }
        if (data === 'choose_language') {
            await bot.editMessageText(t('choose_language', lang), {
                chat_id: chatId, message_id: query.message.message_id,
                reply_markup: { inline_keyboard: buttons.getLanguageButtons() }
            }); return;
        }

        // ── Main menu ──────────────────────────────────────────────────────────
        if (data === 'main_menu') {
            menuHandler.showMainMenu(bot, chatId, userId); return;
        }

        // ── YouTube Video ──────────────────────────────────────────────────────
        if (data === 'video_download') {
            videoHandler.initiateVideoDownload(bot, chatId, userStates);
        } else if (data.startsWith('vq_')) {
            videoHandler.handleQualitySelection(bot, query, userStates);
        }

        // ── YouTube Audio ──────────────────────────────────────────────────────
        else if (data === 'audio_download') {
            audioHandler.initiateAudioDownload(bot, chatId, userStates);
        } else if (data.startsWith('aq_')) {
            audioHandler.handleAudioQuality(bot, query, userStates);
        }

        // ── Song Search ────────────────────────────────────────────────────────
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

        // ── TikTok ─────────────────────────────────────────────────────────────
        else if (data === 'tiktok') {
            tiktokHandler.initiateTikTok(bot, chatId, userStates);
        } else if (data === 'tiktok_video') {
            tiktokHandler.askTikTokUrl(bot, chatId, 'video', userStates);
        } else if (data === 'tiktok_mp3') {
            tiktokHandler.askTikTokUrl(bot, chatId, 'mp3', userStates);
        } else if (data.startsWith('taq_')) {
            tiktokHandler.handleTikTokMp3Quality(bot, query, userStates);
        }

        // ── Settings ───────────────────────────────────────────────────────────
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

    adminHandler.registerUser(msg.from.id, msg.from.first_name, getUserLang(msg.from.id));

    try {
        switch (state.action) {
            // YouTube
            case 'awaiting_video_url':
                videoHandler.processVideoUrl(bot, msg, userStates); break;
            case 'awaiting_audio_url':
                audioHandler.processAudioUrl(bot, msg, userStates); break;
            case 'awaiting_song_query':
                songHandler.processSongSearch(bot, msg, userStates); break;
            case 'awaiting_thumbnail_url':
                thumbnailHandler.processThumbnailUrl(bot, msg, userStates); break;
            // TikTok
            case 'awaiting_tiktok_video_url':
                tiktokHandler.processTikTokVideoUrl(bot, msg, userStates); break;
            case 'awaiting_tiktok_mp3_url':
                tiktokHandler.processTikTokMp3Url(bot, msg, userStates); break;
        }
    } catch (error) {
        console.error('Message handler error:', error);
        bot.sendMessage(chatId, t('error_generic', getUserLang(msg.from.id)));
    }
});

cleanupService.startCleanupScheduler();

console.log('');
console.log('╔════════════════════════════════════════════╗');
console.log('║  🎬 YouTube + TikTok Downloader Bot        ║');
console.log('║  ✅ Bot is running and ready...            ║');
console.log('╚════════════════════════════════════════════╝');
console.log('');

process.on('SIGINT',  () => { bot.stopPolling(); process.exit(0); });
process.on('SIGTERM', () => { bot.stopPolling(); process.exit(0); });