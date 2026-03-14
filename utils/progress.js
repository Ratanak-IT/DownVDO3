/**
 * ⏳ Progress Utility
 * Progress and status messages with safe editing
 */

// Track last message content to avoid duplicate edits
const lastMessageContent = new Map();

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

/**
 * Get downloading with percentage
 * @param {number} percent 
 * @param {string} type - 'video' or 'audio'
 * @returns {string}
 */
function getDownloadingWithPercent(percent, type = 'video') {
    const emoji = type === 'video' ? '🎬' : '🎵';
    const bar = getProgressBar(percent);
    return `${emoji} <b>Downloading ${type}...</b>\n\n${bar}`;
}

/**
 * Safely edit message text (handles "message not modified" error)
 * @param {TelegramBot} bot 
 * @param {number} chatId 
 * @param {number} messageId 
 * @param {string} text 
 * @param {Object} options 
 * @returns {Promise<boolean>} - Returns true if edit was successful
 */
async function safeEditMessage(bot, chatId, messageId, text, options = {}) {
    const key = `${chatId}_${messageId}`;
    const lastContent = lastMessageContent.get(key);
    
    // Skip if content is the same
    if (lastContent === text) {
        return false;
    }
    
    try {
        await bot.editMessageText(text, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'HTML',
            ...options
        });
        
        // Store the new content
        lastMessageContent.set(key, text);
        return true;
    } catch (error) {
        // Ignore "message not modified" error
        if (error.message && error.message.includes('message is not modified')) {
            return false;
        }
        // Ignore "message to edit not found" error
        if (error.message && error.message.includes('message to edit not found')) {
            return false;
        }
        // Re-throw other errors
        throw error;
    }
}

/**
 * Safely delete message (handles errors gracefully)
 * @param {TelegramBot} bot 
 * @param {number} chatId 
 * @param {number} messageId 
 * @returns {Promise<boolean>}
 */
async function safeDeleteMessage(bot, chatId, messageId) {
    try {
        await bot.deleteMessage(chatId, messageId);
        // Clean up tracked content
        const key = `${chatId}_${messageId}`;
        lastMessageContent.delete(key);
        return true;
    } catch (error) {
        // Ignore errors (message might already be deleted)
        return false;
    }
}

/**
 * Clear tracked message content for a chat
 * @param {number} chatId 
 * @param {number} messageId 
 */
function clearTrackedMessage(chatId, messageId) {
    const key = `${chatId}_${messageId}`;
    lastMessageContent.delete(key);
}

module.exports = {
    getDownloadingVideo,
    getDownloadingAudio,
    getProcessing,
    getUploading,
    getProgressBar,
    getDownloadingWithPercent,
    safeEditMessage,
    safeDeleteMessage,
    clearTrackedMessage
};