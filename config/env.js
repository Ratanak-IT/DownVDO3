/**
 * 🔧 Environment Configuration
 * Loads and validates all environment variables
 */

require('dotenv').config();
const fs = require('fs');

const config = {
    // Telegram Bot Token
    BOT_TOKEN: process.env.BOT_TOKEN,

    // Owner ID for admin features
    OWNER_ID: parseInt(process.env.OWNER_ID) || 0,

    // Path to YouTube cookies file
    COOKIE_PATH: process.env.COOKIE_PATH || './cookies.txt',

    // Download directory path
    DOWNLOAD_PATH: process.env.DOWNLOAD_PATH || './downloads',

    // Auto delete time in minutes
    AUTO_DELETE_MINUTES: parseInt(process.env.AUTO_DELETE_MINUTES) || 5
};

// Validate required configurations
if (!config.BOT_TOKEN) {
    console.error('❌ BOT_TOKEN is required in .env file');
    process.exit(1);
}

if (!config.OWNER_ID) {
    console.warn('⚠️ OWNER_ID not set. Settings menu will be disabled.');
}

// ── Write cookies from environment variable (for Railway deployment) ───────────
// Set YOUTUBE_COOKIES in Railway Variables with the full Netscape cookies.txt content.
// This writes them to a local file so yt-dlp can read them on every startup.
if (process.env.YOUTUBE_COOKIES && process.env.YOUTUBE_COOKIES.trim()) {
    try {
        fs.writeFileSync(config.COOKIE_PATH, process.env.YOUTUBE_COOKIES.trim(), 'utf8');
        console.log('🍪 YouTube cookies loaded from environment');
    } catch (e) {
        console.error('⚠️  Failed to write cookies:', e.message);
    }
}

module.exports = config;