/**
 * 💬 Messages Utility
 * All bot messages and text templates
 */

/**
 * Get welcome message
 * @param {string} firstName 
 * @returns {string}
 */
function getWelcome(firstName) {
    return `👋 Hey <b>${firstName}</b>!\n\n` +
        `Welcome to the <b>YouTube Downloader Bot</b> 🎬\n\n` +
        `I can help you download videos, convert to MP3, and more!\n\n` +
        `Choose an option below to get started 👇`;
}

/**
 * Get main menu text
 * @returns {string}
 */
function getMenuText() {
    return `🏠 <b>Main Menu</b>\n\nWhat would you like to do?`;
}

/**
 * Get ask for video URL message
 * @returns {string}
 */
function getAskVideoUrl() {
    return `🎬 <b>Video Download</b>\n\n` +
        `Please send me the YouTube video link 🔗`;
}

/**
 * Get ask for audio URL message
 * @returns {string}
 */
function getAskAudioUrl() {
    return `🎵 <b>YouTube to MP3</b>\n\n` +
        `Please send me the YouTube video link 🔗`;
}

/**
 * Get ask for song name message
 * @returns {string}
 */
function getAskSongName() {
    return `🔍 <b>Song Search</b>\n\n` +
        `Send me the song name or YouTube link 🎶`;
}

/**
 * Get ask for thumbnail URL message
 * @returns {string}
 */
function getAskThumbnailUrl() {
    return `🖼️ <b>Thumbnail Download</b>\n\n` +
        `Please send me the YouTube video link 🔗`;
}

/**
 * Get invalid URL message
 * @returns {string}
 */
function getInvalidUrl() {
    return `❌ <b>Invalid URL</b>\n\n` +
        `Please send a valid YouTube link.\n\n` +
        `Supported formats:\n` +
        `• youtube.com/watch?v=...\n` +
        `• youtu.be/...\n` +
        `• youtube.com/shorts/...`;
}

/**
 * Get video info message
 * @param {Object} videoInfo 
 * @returns {string}
 */
function getVideoInfo(videoInfo) {
    const duration = formatDuration(videoInfo.duration);
    const views = formatNumber(videoInfo.viewCount);
    
    return `📹 <b>${escapeHtml(videoInfo.title)}</b>\n\n` +
        `👤 ${escapeHtml(videoInfo.uploader)}\n` +
        `⏱️ Duration: ${duration}\n` +
        `👁️ Views: ${views}\n\n` +
        `Select video quality 👇`;
}

/**
 * Get audio info message
 * @param {Object} videoInfo 
 * @returns {string}
 */
function getAudioInfo(videoInfo) {
    const duration = formatDuration(videoInfo.duration);
    
    return `🎵 <b>${escapeHtml(videoInfo.title)}</b>\n\n` +
        `👤 ${escapeHtml(videoInfo.uploader)}\n` +
        `⏱️ Duration: ${duration}\n\n` +
        `Select audio quality 👇`;
}

/**
 * Get song info message
 * @param {Object} videoInfo 
 * @returns {string}
 */
function getSongInfo(videoInfo) {
    const duration = formatDuration(videoInfo.duration);
    
    return `🎶 <b>${escapeHtml(videoInfo.title)}</b>\n\n` +
        `⏱️ Duration: ${duration}\n\n` +
        `Select audio quality 👇`;
}

/**
 * Get thumbnail info message
 * @param {Object} videoInfo 
 * @returns {string}
 */
function getThumbnailInfo(videoInfo) {
    return `🖼️ <b>${escapeHtml(videoInfo.title)}</b>\n\n` +
        `Select thumbnail quality 👇`;
}

/**
 * Get song search results message
 * @param {string} query 
 * @returns {string}
 */
function getSongSearchResults(query) {
    return `🔍 Search results for: <b>${escapeHtml(query)}</b>\n\n` +
        `Select a song to download 👇`;
}

/**
 * Get download success message
 * @returns {string}
 */
function getDownloadSuccess() {
    return `✅ <b>Download Complete!</b>\n\n` +
        `Your file is ready 🎉`;
}

/**
 * Format duration from seconds
 * @param {number} seconds 
 * @returns {string}
 */
function formatDuration(seconds) {
    if (!seconds || seconds === 0) return 'Unknown';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format large numbers
 * @param {number} num 
 * @returns {string}
 */
function formatNumber(num) {
    if (!num) return 'Unknown';
    
    if (num >= 1000000000) {
        return (num / 1000000000).toFixed(1) + 'B';
    }
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

/**
 * Escape HTML special characters
 * @param {string} text 
 * @returns {string}
 */
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

module.exports = {
    getWelcome,
    getMenuText,
    getAskVideoUrl,
    getAskAudioUrl,
    getAskSongName,
    getAskThumbnailUrl,
    getInvalidUrl,
    getVideoInfo,
    getAudioInfo,
    getSongInfo,
    getThumbnailInfo,
    getSongSearchResults,
    getDownloadSuccess,
    formatDuration,
    formatNumber,
    escapeHtml
};