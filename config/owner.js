/**
 * 👤 Owner Configuration
 * Manages owner permissions and checks
 */

const config = require('./env');

// Store for dynamic settings
const ownerSettings = {
    autoDeleteMinutes: config.AUTO_DELETE_MINUTES
};

/**
 * Check if user is the bot owner
 * @param {number} userId - Telegram user ID
 * @returns {boolean}
 */
function isOwner(userId) {
    return userId === config.OWNER_ID;
}

/**
 * Get current auto-delete setting
 * @returns {number} Minutes
 */
function getAutoDeleteMinutes() {
    return ownerSettings.autoDeleteMinutes;
}

/**
 * Set auto-delete time
 * @param {number} minutes 
 */
function setAutoDeleteMinutes(minutes) {
    ownerSettings.autoDeleteMinutes = minutes;
}

module.exports = {
    isOwner,
    getAutoDeleteMinutes,
    setAutoDeleteMinutes,
    ownerSettings
};