/**
 * 🎧 FFmpeg Service
 * Handles audio/video conversion operations
 */

const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/env');

/**
 * Convert audio file to MP3 with specified bitrate
 * @param {string} inputPath 
 * @param {string} bitrate 
 * @returns {Promise<string>} Output file path
 */
function convertToMp3(inputPath, bitrate) {
    return new Promise((resolve, reject) => {
        // If already MP3, check if re-encoding is needed
        if (inputPath.endsWith('.mp3')) {
            // Just return the path if it's already MP3
            resolve(inputPath);
            return;
        }

        const outputFileName = `converted_${uuidv4()}.mp3`;
        const outputPath = path.join(config.DOWNLOAD_PATH, outputFileName);

        ffmpeg(inputPath)
            .audioCodec('libmp3lame')
            .audioBitrate(bitrate)
            .audioChannels(2)
            .audioFrequency(44100)
            .on('start', (cmd) => {
                console.log('FFmpeg started:', cmd);
            })
            .on('progress', (progress) => {
                console.log('FFmpeg progress:', progress.percent?.toFixed(1) + '%');
            })
            .on('error', (err) => {
                console.error('FFmpeg error:', err);
                reject(err);
            })
            .on('end', () => {
                console.log('FFmpeg conversion complete');
                // Delete original file
                fs.unlink(inputPath, (err) => {
                    if (err) console.error('Failed to delete original:', err);
                });
                resolve(outputPath);
            })
            .save(outputPath);
    });
}

/**
 * Extract audio from video file
 * @param {string} inputPath 
 * @param {string} bitrate 
 * @returns {Promise<string>}
 */
function extractAudio(inputPath, bitrate) {
    return new Promise((resolve, reject) => {
        const outputFileName = `extracted_${uuidv4()}.mp3`;
        const outputPath = path.join(config.DOWNLOAD_PATH, outputFileName);

        ffmpeg(inputPath)
            .noVideo()
            .audioCodec('libmp3lame')
            .audioBitrate(bitrate)
            .on('error', (err) => {
                reject(err);
            })
            .on('end', () => {
                resolve(outputPath);
            })
            .save(outputPath);
    });
}

/**
 * Get media file duration
 * @param {string} filePath 
 * @returns {Promise<number>} Duration in seconds
 */
function getDuration(filePath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(metadata.format.duration || 0);
        });
    });
}

module.exports = {
    convertToMp3,
    extractAudio,
    getDuration
};