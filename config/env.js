/**
 * ⚙️ Environment Configuration
 */

require('dotenv').config();
const fs = require('fs');

// Debug: log which env vars are present on startup
console.log('🔧 ENV check:', {
    BOT_TOKEN:     process.env.BOT_TOKEN     ? '✅ set' : '❌ missing',
    OWNER_ID:      process.env.OWNER_ID      ? '✅ set' : '❌ missing',
    DOWNLOAD_PATH: process.env.DOWNLOAD_PATH ? '✅ set' : '⚠️ using default',
    COOKIE_PATH:   process.env.COOKIE_PATH   ? '✅ set' : '⚠️ using default',
});

if (!process.env.BOT_TOKEN) {
    console.error('❌ BOT_TOKEN is missing!');
    console.error('   Railway: set it in Service → Variables tab.');
    console.error('   Local:   add BOT_TOKEN=xxx to your .env file.');
    process.exit(1);
}

const config = {
    BOT_TOKEN:           process.env.BOT_TOKEN,
    OWNER_ID:            parseInt(process.env.OWNER_ID)            || 0,
    ADMIN_ID:            parseInt(process.env.ADMIN_ID)            || 0,
    COOKIE_PATH:         process.env.COOKIE_PATH                   || './cookies.txt',
    DOWNLOAD_PATH:       process.env.DOWNLOAD_PATH                 || './downloads',
    AUTO_DELETE_MINUTES: parseInt(process.env.AUTO_DELETE_MINUTES) || 5,
};

if (!config.OWNER_ID) {
    console.warn('⚠️  OWNER_ID not set — Settings menu will be disabled.');
}

// ── Write YouTube cookies from environment variable ────────────────────────────
if (process.env.YOUTUBE_COOKIES && process.env.YOUTUBE_COOKIES.trim()) {
    try {
        const lines = process.env.YOUTUBE_COOKIES.trim().split('\n').map(line => {
            if (line.startsWith('#') || line.trim() === '') return line;
            if (line.includes('\t')) return line;
            // Fix spaces → tabs (Railway sometimes strips tabs)
            const parts = line.trim().split(/\s{2,}/);
            if (parts.length >= 7) return parts.slice(0, 6).join('\t') + '\t' + parts.slice(6).join(' ');
            const single = line.trim().split(' ');
            if (single.length >= 7) return single.slice(0, 6).join('\t') + '\t' + single.slice(6).join(' ');
            return line;
        });

        const content = lines[0].startsWith('# Netscape')
            ? lines.join('\n')
            : '# Netscape HTTP Cookie File\n' + lines.join('\n');

        fs.writeFileSync(config.COOKIE_PATH, content, 'utf8');

        const firstData = lines.find(l => l.trim() && !l.startsWith('#'));
        const fields    = firstData ? firstData.split('\t').length : 0;
        console.log(`🍪 YouTube cookies loaded (${fields}/7 fields detected)`);
    } catch (e) {
        console.error('⚠️  Failed to write cookies:', e.message);
    }
}

module.exports = config;