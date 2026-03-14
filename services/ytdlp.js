
const { spawnSync, spawn } = require('child_process');
const path   = require('path');
const fs     = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/env');

// ── Find yt-dlp binary ─────────────────────────────────────────────────────────
// On Railway: system binary from pip  → 'yt-dlp'
// On Windows local: yt-dlp-exec bundled binary
function getYtDlpBin() {
    const test = spawnSync('yt-dlp', ['--version'], { encoding: 'utf8' });
    if (test.status === 0) {
        console.log('✅ Using system yt-dlp:', test.stdout.trim());
        return 'yt-dlp';
    }
    // Fallback: use the binary bundled with yt-dlp-exec npm package
    try {
        const binPath = require('yt-dlp-exec').raw;
        console.log('✅ Using yt-dlp-exec binary:', binPath);
        return binPath;
    } catch {
        console.warn('⚠️  yt-dlp not found via system or npm, using "yt-dlp" and hoping for the best');
        return 'yt-dlp';
    }
}

const YT_DLP_BIN = getYtDlpBin();

// ── Helpers ────────────────────────────────────────────────────────────────────

function getCookieArgs() {
    if (fs.existsSync(config.COOKIE_PATH)) {
        return ['--cookies', config.COOKIE_PATH];
    }
    return [];
}

function ensureDownloadsDir() {
    if (!fs.existsSync(config.DOWNLOAD_PATH)) {
        fs.mkdirSync(config.DOWNLOAD_PATH, { recursive: true });
    }
}

/**
 * Run yt-dlp with given args, return stdout as string
 * @param {string[]} args
 * @returns {Promise<string>}
 */
function runYtDlp(args) {
    return new Promise((resolve, reject) => {
        const fullArgs = [...args, ...getCookieArgs()];
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
                // Surface the real yt-dlp error message
                reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`));
                return;
            }
            resolve(stdout);
        });
    });
}

// ── URL validation ─────────────────────────────────────────────────────────────

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

function extractVideoId(url) {
    const match = url.match(
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : null;
}

// ── Core functions ─────────────────────────────────────────────────────────────

async function getVideoInfo(url) {
    const stdout = await runYtDlp([
        '--dump-json',
        '--no-warnings',
        '--no-playlist',
        url,
    ]);

    const info = JSON.parse(stdout);

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

async function downloadVideo(url, quality, chatId) {
    ensureDownloadsDir();

    const uid        = uuidv4();
    const outputPath = path.join(config.DOWNLOAD_PATH, `video_${chatId}_${uid}.mp4`);
    const height     = parseInt(quality.replace('p', ''));

    await runYtDlp([
        '-f', `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`,
        '--merge-output-format', 'mp4',
        '-o', outputPath,
        '--no-warnings',
        '--no-playlist',
        url,
    ]);

    const files = fs.readdirSync(config.DOWNLOAD_PATH);
    const match = files.find(f => f.startsWith(`video_${chatId}_${uid}`));
    if (match) return path.join(config.DOWNLOAD_PATH, match);
    if (fs.existsSync(outputPath)) return outputPath;
    throw new Error('Downloaded video file not found on disk');
}

async function downloadAudio(url, bitrate, chatId) {
    ensureDownloadsDir();

    const uid            = uuidv4();
    const outputTemplate = path.join(config.DOWNLOAD_PATH, `audio_${chatId}_${uid}.%(ext)s`);

    await runYtDlp([
        '-f', 'bestaudio/best',
        '-x',
        '--audio-format', 'mp3',
        '--audio-quality', `${bitrate}K`,
        '-o', outputTemplate,
        '--no-warnings',
        '--no-playlist',
        url,
    ]);

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
    ]);

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

// ──────────────────────────────────────────────────────────────────────────────

module.exports = {
    isValidYouTubeUrl,
    extractVideoId,
    getVideoInfo,
    downloadVideo,
    downloadAudio,
    searchYouTube,
};