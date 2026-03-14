/**
 * 🔧 yt-dlp Service
 * Handles all YouTube download operations
 *
 * On Railway/Linux: uses system yt-dlp installed via pip (always up-to-date)
 * On Windows/local: falls back to yt-dlp-exec bundled binary
 */

const { execSync } = require('child_process');

// Prefer system yt-dlp (Railway has this via pip install in Dockerfile).
// Fall back to the npm-bundled binary for local Windows dev.
function resolveYtDlp() {
    try {
        execSync('yt-dlp --version', { stdio: 'ignore' });
        // System binary works — create a wrapper that calls it
        const { create } = require('yt-dlp-exec');
        return create('yt-dlp');
    } catch {
        // System binary not found — use bundled binary (works on Windows)
        return require('yt-dlp-exec');
    }
}

const ytDlp = resolveYtDlp();
const path  = require('path');
const fs    = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/env');

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Build shared base flags (cookies, no-warnings, no-playlist)
 */
function baseFlags() {
    const flags = {};
    if (fs.existsSync(config.COOKIE_PATH)) {
        flags.cookies = config.COOKIE_PATH;
    }
    return flags;
}

/**
 * Ensure the downloads directory exists
 */
function ensureDownloadsDir() {
    if (!fs.existsSync(config.DOWNLOAD_PATH)) {
        fs.mkdirSync(config.DOWNLOAD_PATH, { recursive: true });
    }
}

// ── URL validation ─────────────────────────────────────────────────────────────

/**
 * Check if URL is a valid YouTube URL
 * @param {string} url
 * @returns {boolean}
 */
function isValidYouTubeUrl(url) {
    const patterns = [
        /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=[\w-]+/,
        /^(https?:\/\/)?(www\.)?youtube\.com\/shorts\/[\w-]+/,
        /^(https?:\/\/)?youtu\.be\/[\w-]+/,
        /^(https?:\/\/)?(www\.)?youtube\.com\/embed\/[\w-]+/,
        /^(https?:\/\/)?m\.youtube\.com\/watch\?v=[\w-]+/,
    ];
    return patterns.some(p => p.test(url));
}

/**
 * Extract video ID from YouTube URL
 * @param {string} url
 * @returns {string|null}
 */
function extractVideoId(url) {
    const match = url.match(
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : null;
}

// ── Core functions ─────────────────────────────────────────────────────────────

/**
 * Get video information
 * @param {string} url
 * @returns {Promise<Object>}
 */
async function getVideoInfo(url) {
    const info = await ytDlp(url, {
        dumpJson:   true,
        noWarnings: true,
        noPlaylist: true,
        ...baseFlags(),
    });

    // Extract available video qualities
    const formats    = [];
    const qualitySet = new Set();

    if (info.formats) {
        info.formats.forEach(fmt => {
            if (fmt.height && fmt.vcodec !== 'none') {
                const quality = `${fmt.height}p`;
                if (!qualitySet.has(quality)) {
                    qualitySet.add(quality);
                    formats.push({ quality, height: fmt.height, formatId: fmt.format_id });
                }
            }
        });
    }

    formats.sort((a, b) => a.height - b.height);

    return {
        title:     info.title      || 'Unknown Title',
        duration:  info.duration   || 0,
        thumbnail: info.thumbnail  || '',
        uploader:  info.uploader   || 'Unknown',
        viewCount: info.view_count || 0,
        formats,
        videoId:   info.id,
    };
}

/**
 * Download video with specified quality
 * @param {string} url
 * @param {string} quality  e.g. "720p"
 * @param {number} chatId
 * @returns {Promise<string>} Absolute file path
 */
async function downloadVideo(url, quality, chatId) {
    ensureDownloadsDir();

    const uid        = uuidv4();
    const fileName   = `video_${chatId}_${uid}.mp4`;
    const outputPath = path.join(config.DOWNLOAD_PATH, fileName);
    const height     = parseInt(quality.replace('p', ''));

    await ytDlp(url, {
        format:            `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`,
        mergeOutputFormat: 'mp4',
        output:            outputPath,
        noWarnings:        true,
        noPlaylist:        true,
        ...baseFlags(),
    });

    // yt-dlp may append the real extension — find the file
    const files = fs.readdirSync(config.DOWNLOAD_PATH);
    const match = files.find(f => f.startsWith(`video_${chatId}_${uid}`));
    if (match) return path.join(config.DOWNLOAD_PATH, match);
    if (fs.existsSync(outputPath)) return outputPath;
    throw new Error('Downloaded video file not found on disk');
}

/**
 * Download audio as MP3
 * @param {string} url
 * @param {string} bitrate  e.g. "128"
 * @param {number} chatId
 * @returns {Promise<string>} Absolute file path
 */
async function downloadAudio(url, bitrate, chatId) {
    ensureDownloadsDir();

    const uid            = uuidv4();
    const outputTemplate = path.join(config.DOWNLOAD_PATH, `audio_${chatId}_${uid}.%(ext)s`);

    await ytDlp(url, {
        format:        'bestaudio/best',
        extractAudio:  true,
        audioFormat:   'mp3',
        audioQuality:  `${bitrate}K`,
        output:        outputTemplate,
        noWarnings:    true,
        noPlaylist:    true,
        ...baseFlags(),
    });

    const files = fs.readdirSync(config.DOWNLOAD_PATH);
    const match = files.find(f => f.startsWith(`audio_${chatId}_${uid}`));
    if (match) return path.join(config.DOWNLOAD_PATH, match);
    throw new Error('Downloaded audio file not found on disk');
}

/**
 * Search YouTube for videos
 * @param {string} query
 * @param {number} limit
 * @returns {Promise<Array>}
 */
async function searchYouTube(query, limit = 10) {
    const raw = await ytDlp(`ytsearch${limit}:${query}`, {
        dumpJson:     true,
        flatPlaylist: true,
        noWarnings:   true,
        ...baseFlags(),
    });

    // yt-dlp-exec returns a single object for flat-playlist searches
    // It may return one object or an array depending on version — normalise both
    const items  = Array.isArray(raw) ? raw : [raw];
    const results = [];

    items.forEach((item, index) => {
        if (!item || !item.id) return;
        results.push({
            title:    item.title    || 'Unknown',
            url:      item.url      || `https://www.youtube.com/watch?v=${item.id}`,
            duration: item.duration || 0,
            index,
        });
    });

    return results;
}

// ──────────────────────────────────────────────────────────────────────────────

module.exports = {
    isValidYouTubeUrl,
    extractVideoId,
    getVideoInfo,
    downloadVideo,
    downloadAudio,
    searchYouTube,
};