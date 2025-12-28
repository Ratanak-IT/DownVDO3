/**
 * 🔧 yt-dlp Service
 * Handles all YouTube download operations
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/env');

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
        /^(https?:\/\/)?m\.youtube\.com\/watch\?v=[\w-]+/
    ];
    
    return patterns.some(pattern => pattern.test(url));
}

/**
 * Extract video ID from YouTube URL
 * @param {string} url 
 * @returns {string|null}
 */
function extractVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    
    return null;
}

/**
 * Get video information using yt-dlp
 * @param {string} url 
 * @returns {Promise<Object>}
 */
function getVideoInfo(url) {
    return new Promise((resolve, reject) => {
        const args = [
            '--dump-json',
            '--no-warnings',
            '--no-playlist'
        ];

        // Add cookies if available
        if (fs.existsSync(config.COOKIE_PATH)) {
            args.push('--cookies', config.COOKIE_PATH);
        }

        args.push(url);

        const process = spawn('yt-dlp', args);
        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        process.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`yt-dlp error: ${stderr}`));
                return;
            }

            try {
                const info = JSON.parse(stdout);
                
                // Extract available video formats
                const formats = [];
                const qualitySet = new Set();
                
                if (info.formats) {
                    info.formats.forEach(format => {
                        if (format.height && format.vcodec !== 'none') {
                            const quality = `${format.height}p`;
                            if (!qualitySet.has(quality)) {
                                qualitySet.add(quality);
                                formats.push({
                                    quality: quality,
                                    height: format.height,
                                    formatId: format.format_id
                                });
                            }
                        }
                    });
                }

                // Sort by height
                formats.sort((a, b) => a.height - b.height);

                resolve({
                    title: info.title || 'Unknown Title',
                    duration: info.duration || 0,
                    thumbnail: info.thumbnail || '',
                    uploader: info.uploader || 'Unknown',
                    viewCount: info.view_count || 0,
                    formats: formats,
                    videoId: info.id
                });
            } catch (error) {
                reject(new Error('Failed to parse video info'));
            }
        });

        process.on('error', (error) => {
            reject(error);
        });
    });
}

/**
 * Download video with specified quality
 * @param {string} url 
 * @param {string} quality 
 * @param {number} chatId 
 * @returns {Promise<string>} File path
 */
function downloadVideo(url, quality, chatId) {
    return new Promise((resolve, reject) => {
        const fileName = `video_${chatId}_${uuidv4()}.mp4`;
        const outputPath = path.join(config.DOWNLOAD_PATH, fileName);
        
        // Build format selection based on quality
        const height = parseInt(quality.replace('p', ''));
        const formatSelector = `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`;

        const args = [
            '-f', formatSelector,
            '--merge-output-format', 'mp4',
            '-o', outputPath,
            '--no-warnings',
            '--no-playlist'
        ];

        // Add cookies if available
        if (fs.existsSync(config.COOKIE_PATH)) {
            args.push('--cookies', config.COOKIE_PATH);
        }

        args.push(url);

        const process = spawn('yt-dlp', args);
        let stderr = '';

        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        process.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Download failed: ${stderr}`));
                return;
            }
            
            // Find the actual output file (might have different extension)
            const files = fs.readdirSync(config.DOWNLOAD_PATH);
            const matchingFile = files.find(f => f.startsWith(`video_${chatId}_`));
            
            if (matchingFile) {
                resolve(path.join(config.DOWNLOAD_PATH, matchingFile));
            } else if (fs.existsSync(outputPath)) {
                resolve(outputPath);
            } else {
                reject(new Error('Output file not found'));
            }
        });

        process.on('error', (error) => {
            reject(error);
        });
    });
}

/**
 * Download audio only
 * @param {string} url 
 * @param {string} bitrate 
 * @param {number} chatId 
 * @returns {Promise<string>} File path
 */
function downloadAudio(url, bitrate, chatId) {
    return new Promise((resolve, reject) => {
        const fileName = `audio_${chatId}_${uuidv4()}`;
        const outputTemplate = path.join(config.DOWNLOAD_PATH, fileName);

        const args = [
            '-f', 'bestaudio/best',
            '-x',
            '--audio-format', 'mp3',
            '--audio-quality', `${bitrate}K`,
            '-o', `${outputTemplate}.%(ext)s`,
            '--no-warnings',
            '--no-playlist'
        ];

        // Add cookies if available
        if (fs.existsSync(config.COOKIE_PATH)) {
            args.push('--cookies', config.COOKIE_PATH);
        }

        args.push(url);

        const process = spawn('yt-dlp', args);
        let stderr = '';

        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        process.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Audio download failed: ${stderr}`));
                return;
            }

            // Find the output file
            const files = fs.readdirSync(config.DOWNLOAD_PATH);
            const matchingFile = files.find(f => f.startsWith(`audio_${chatId}_`));
            
            if (matchingFile) {
                resolve(path.join(config.DOWNLOAD_PATH, matchingFile));
            } else {
                reject(new Error('Audio file not found'));
            }
        });

        process.on('error', (error) => {
            reject(error);
        });
    });
}

/**
 * Search YouTube for videos
 * @param {string} query 
 * @param {number} limit 
 * @returns {Promise<Array>}
 */
function searchYouTube(query, limit = 10) {
    return new Promise((resolve, reject) => {
        const args = [
            `ytsearch${limit}:${query}`,
            '--dump-json',
            '--flat-playlist',
            '--no-warnings'
        ];

        // Add cookies if available
        if (fs.existsSync(config.COOKIE_PATH)) {
            args.push('--cookies', config.COOKIE_PATH);
        }

        const process = spawn('yt-dlp', args);
        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        process.on('close', (code) => {
            if (code !== 0 && !stdout) {
                reject(new Error(`Search failed: ${stderr}`));
                return;
            }

            try {
                const results = [];
                const lines = stdout.trim().split('\n');
                
                lines.forEach((line, index) => {
                    if (line) {
                        try {
                            const item = JSON.parse(line);
                            results.push({
                                title: item.title || 'Unknown',
                                url: item.url || `https://www.youtube.com/watch?v=${item.id}`,
                                duration: item.duration || 0,
                                index: index
                            });
                        } catch (e) {
                            // Skip invalid lines
                        }
                    }
                });

                resolve(results);
            } catch (error) {
                reject(new Error('Failed to parse search results'));
            }
        });

        process.on('error', (error) => {
            reject(error);
        });
    });
}

module.exports = {
    isValidYouTubeUrl,
    extractVideoId,
    getVideoInfo,
    downloadVideo,
    downloadAudio,
    searchYouTube
};