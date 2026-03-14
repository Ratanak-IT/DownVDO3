/**
 * 🔧 yt-dlp Service
 * Handles YouTube + TikTok download operations
 */

const { spawnSync, spawn } = require('child_process');
const path   = require('path');
const fs     = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/env');

// ── Find yt-dlp binary ─────────────────────────────────────────────────────────
function getYtDlpBin() {
    const test = spawnSync('yt-dlp', ['--version'], { encoding: 'utf8' });
    if (test.status === 0) {
        console.log('✅ Using system yt-dlp:', test.stdout.trim());
        return 'yt-dlp';
    }
    try {
        const binPath = require('yt-dlp-exec').raw;
        console.log('✅ Using yt-dlp-exec binary:', binPath);
        return binPath;
    } catch {
        console.warn('⚠️  yt-dlp not found via system or npm');
        return 'yt-dlp';
    }
}

const YT_DLP_BIN = getYtDlpBin();

// ── Helpers ────────────────────────────────────────────────────────────────────

function getCookieArgs(platform = 'youtube') {
    // Only use cookies for YouTube — TikTok doesn't need them
    if (platform === 'youtube' && fs.existsSync(config.COOKIE_PATH)) {
        return ['--cookies', config.COOKIE_PATH];
    }
    return [];
}

function ensureDownloadsDir() {
    if (!fs.existsSync(config.DOWNLOAD_PATH)) {
        fs.mkdirSync(config.DOWNLOAD_PATH, { recursive: true });
    }
}

function runYtDlp(args, platform = 'youtube') {
    return new Promise((resolve, reject) => {
        const fullArgs = [...args, ...getCookieArgs(platform)];
        console.log('▶ yt-dlp', fullArgs.join(' '));

        const proc = spawn(YT_DLP_BIN, fullArgs);
        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', d => { stdout += d.toString(); });
        proc.stderr.on('data', d => { stderr += d.toString(); });

        proc.on('error', err => {
            reject(new Error(`Failed to start yt-dlp: ${err.message}`));
        });

        proc.on('close', code => {
            if (code !== 0) {
                reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`));
                return;
            }
            resolve(stdout);
        });
    });
}

// ── URL detection ──────────────────────────────────────────────────────────────

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

function isValidTikTokUrl(url) {
    const patterns = [
        /^(https?:\/\/)?(www\.)?tiktok\.com\/@[\w.-]+\/video\/\d+/,
        /^(https?:\/\/)?vm\.tiktok\.com\/[\w]+/,
        /^(https?:\/\/)?vt\.tiktok\.com\/[\w]+/,
        /^(https?:\/\/)?m\.tiktok\.com\/v\/\d+/,
    ];
    return patterns.some(p => p.test(url));
}

/**
 * Detect platform from URL
 * @param {string} url
 * @returns {'youtube'|'tiktok'|null}
 */
function detectPlatform(url) {
    if (isValidYouTubeUrl(url)) return 'youtube';
    if (isValidTikTokUrl(url)) return 'tiktok';
    return null;
}

function extractVideoId(url) {
    const match = url.match(
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : null;
}

// ── Core functions ─────────────────────────────────────────────────────────────

async function getVideoInfo(url) {
    const platform = detectPlatform(url);

    const stdout = await runYtDlp([
        '--dump-json',
        '--no-warnings',
        '--no-playlist',
        url,
    ], platform);

    const info = JSON.parse(stdout);
    const formats    = [];
    const qualitySet = new Set();

    if (info.formats) {
        // Pre-check: does this video have any downloadable audio at all?
        // YouTube: has audio-only streams (vcodec = 'none', acodec = something)
        // TikTok:  has combined streams (both vcodec and acodec set)
        const hasSeparateAudio = info.formats.some(
            f => f.acodec && f.acodec !== 'none' && f.vcodec === 'none'
        );

        info.formats.forEach(fmt => {
            // Must have video
            if (!fmt.height || !fmt.vcodec || fmt.vcodec === 'none') return;

            const hasCombinedAudio = fmt.acodec && fmt.acodec !== 'none';

            // Show quality button if:
            // - Format is combined (TikTok style: video+audio in one stream), OR
            // - There is a separate audio stream to merge with (YouTube style)
            if (hasCombinedAudio || hasSeparateAudio) {
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
        uploader:  info.uploader   || info.creator || 'Unknown',
        viewCount: info.view_count || 0,
        formats,
        videoId:   info.id,
        platform,
    };
}

async function downloadVideo(url, quality, chatId) {
    ensureDownloadsDir();

    const platform   = detectPlatform(url);
    const uid        = uuidv4();
    const outputPath = path.join(config.DOWNLOAD_PATH, `video_${chatId}_${uid}.mp4`);
    const height     = parseInt(quality.replace('p', ''));

    if (platform === 'tiktok') {
        // TikTok no-watermark: use h264 format which has no watermark burned in
        // --no-check-certificates handles some TikTok region issues
        await runYtDlp([
            '--format-sort', `res:${height},ext:mp4,+codec:h264`,
            '--merge-output-format', 'mp4',
            '-o', outputPath,
            '--no-warnings',
            '--no-playlist',
            '--no-check-certificates',
            url,
        ], 'tiktok');
    } else {
        // YouTube: use format-sort without -f to avoid "format not available"
        await runYtDlp([
            '--format-sort', `res:${height},ext:mp4:m4a,+size`,
            '--merge-output-format', 'mp4',
            '-o', outputPath,
            '--no-warnings',
            '--no-playlist',
            url,
        ], 'youtube');
    }

    const files = fs.readdirSync(config.DOWNLOAD_PATH);
    const match = files.find(f => f.startsWith(`video_${chatId}_${uid}`));
    if (match) return path.join(config.DOWNLOAD_PATH, match);
    if (fs.existsSync(outputPath)) return outputPath;
    throw new Error('Downloaded video file not found on disk');
}

async function downloadTikTokVideo(url, chatId) {
    ensureDownloadsDir();

    const uid        = uuidv4();
    const outputPath = path.join(config.DOWNLOAD_PATH, `video_${chatId}_${uid}.mp4`);

    // Best quality, no watermark (h264 has no watermark on TikTok)
    await runYtDlp([
        '--format-sort', 'ext:mp4,+codec:h264,+res',
        '--merge-output-format', 'mp4',
        '-o', outputPath,
        '--no-warnings',
        '--no-playlist',
        '--no-check-certificates',
        url,
    ], 'tiktok');

    const files = fs.readdirSync(config.DOWNLOAD_PATH);
    const match = files.find(f => f.startsWith(`video_${chatId}_${uid}`));
    if (match) return path.join(config.DOWNLOAD_PATH, match);
    if (fs.existsSync(outputPath)) return outputPath;
    throw new Error('Downloaded TikTok video file not found on disk');
}

async function downloadAudio(url, bitrate, chatId) {
    ensureDownloadsDir();

    const platform       = detectPlatform(url);
    const uid            = uuidv4();
    const outputTemplate = path.join(config.DOWNLOAD_PATH, `audio_${chatId}_${uid}.%(ext)s`);

    await runYtDlp([
        '-f', 'bestaudio/best',
        '-x',
        '--audio-format', 'mp3',
        '--audio-quality', `${bitrate}K`,
        '--no-warnings',
        '--no-playlist',
        '-o', outputTemplate,
        url,
    ], platform);

    const files = fs.readdirSync(config.DOWNLOAD_PATH);
    const match = files.find(f => f.startsWith(`audio_${chatId}_${uid}`));
    if (match) return path.join(config.DOWNLOAD_PATH, match);
    throw new Error('Downloaded audio file not found on disk');
}

async function searchYouTube(query, limit = 10) {
    const stdout = await runYtDlp([
        `ytsearch${limit}:${query}`,
        '--dump-json',
        '--flat-playlist',
        '--no-warnings',
    ], 'youtube');

    const results = [];
    const lines   = stdout.trim().split('\n');

    lines.forEach((line, index) => {
        if (!line.trim()) return;
        try {
            const item = JSON.parse(line);
            if (!item.id) return;
            results.push({
                title:    item.title    || 'Unknown',
                url:      item.url      || `https://www.youtube.com/watch?v=${item.id}`,
                duration: item.duration || 0,
                index,
            });
        } catch { /* skip bad lines */ }
    });

    return results;
}

module.exports = {
    isValidYouTubeUrl,
    isValidTikTokUrl,
    detectPlatform,
    extractVideoId,
    getVideoInfo,
    downloadVideo,
    downloadTikTokVideo,
    downloadAudio,
    searchYouTube,
};