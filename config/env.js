/**
 * ⚙️ Environment Configuration
 */

require('dotenv').config();
const fs = require('fs');

const config = {
    BOT_TOKEN:           process.env.BOT_TOKEN,
    OWNER_ID:            parseInt(process.env.OWNER_ID) || 0,
    COOKIE_PATH:         process.env.COOKIE_PATH || './cookies.txt',
    DOWNLOAD_PATH:       process.env.DOWNLOAD_PATH || './downloads',
    AUTO_DELETE_MINUTES: parseInt(process.env.AUTO_DELETE_MINUTES) || 5
};

if (!config.BOT_TOKEN) {
    console.error('❌ BOT_TOKEN is required in .env file');
    process.exit(1);
}

if (!config.OWNER_ID) {
    console.warn('⚠️ OWNER_ID not set. Settings menu will be disabled.');
}

// ── Write YouTube cookies from environment variable ────────────────────────────
if (process.env.YOUTUBE_COOKIES && process.env.YOUTUBE_COOKIES.trim()) {
    try {
        let raw = process.env.YOUTUBE_COOKIES.trim();

        // Railway sometimes converts tab characters to spaces when storing
        // multi-line env vars. Netscape cookie format requires real tabs
        // between the 7 fields. Detect and fix space-separated lines.
        const lines = raw.split('\n').map(line => {
            // Skip comment lines and empty lines — leave them as-is
            if (line.startsWith('#') || line.trim() === '') return line;

            // If the line has tabs already, it's fine
            if (line.includes('\t')) return line;

            // Line uses spaces instead of tabs — split on 2+ spaces and
            // rejoin with tabs. Netscape format: domain flag path secure expiry name value
            // The value field itself may contain spaces, so we limit to 6 splits.
            const parts = line.trim().split(/\s{2,}/);
            if (parts.length >= 7) {
                return parts.slice(0, 6).join('\t') + '\t' + parts.slice(6).join(' ');
            }
            // If splitting on 2+ spaces didn't give 7 fields, try single spaces
            // but only split exactly 6 times (value may have spaces)
            const singleParts = line.trim().split(' ');
            if (singleParts.length >= 7) {
                return singleParts.slice(0, 6).join('\t') + '\t' + singleParts.slice(6).join(' ');
            }
            return line;
        });

        // Ensure the Netscape header is present
        const content = lines[0].startsWith('# Netscape')
            ? lines.join('\n')
            : '# Netscape HTTP Cookie File\n' + lines.join('\n');

        fs.writeFileSync(config.COOKIE_PATH, content, 'utf8');
        console.log('🍪 YouTube cookies loaded from environment');

        // Debug: show first non-comment line to confirm tabs are present
        const firstDataLine = lines.find(l => l.trim() && !l.startsWith('#'));
        if (firstDataLine) {
            const fieldCount = firstDataLine.split('\t').length;
            console.log(`   Cookie fields detected: ${fieldCount} (need 7)`);
        }
    } catch (e) {
        console.error('⚠️  Failed to write cookies:', e.message);
    }
}

module.exports = config;