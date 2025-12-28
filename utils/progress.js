/**
 * ⏳ Progress Utility
 * Progress and status messages
 */

/**
 * Get downloading video message
 * @returns {string}
 */
function getDownloadingVideo() {
    return `⏳ <b>Downloading video...</b>\n\n` +
        `Please wait, this may take a moment.`;
}

/**
 * Get downloading audio message
 * @returns {string}
 */
function getDownloadingAudio() {
    return `⏳ <b>Downloading audio...</b>\n\n` +
        `Please wait, this may take a moment.`;
}

/**
 * Get processing message
 * @returns {string}
 */
function getProcessing() {
    return `🔄 <b>Processing file...</b>\n\n` +
        `Almost there!`;
}

/**
 * Get uploading message
 * @returns {string}
 */
function getUploading() {
    return `📤 <b>Uploading to Telegram...</b>\n\n` +
        `Your file will be ready soon!`;
}

/**
 * Get progress bar
 * @param {number} percent 
 * @returns {string}
 */
function getProgressBar(percent) {
    const filled = Math.floor(percent / 10);
    const empty = 10 - filled;
    const bar = '▓'.repeat(filled) + '░'.repeat(empty);
    return `${bar} ${percent}%`;
}

module.exports = {
    getDownloadingVideo,
    getDownloadingAudio,
    getProcessing,
    getUploading,
    getProgressBar
};