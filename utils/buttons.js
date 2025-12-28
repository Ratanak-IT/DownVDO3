/**
 * 🔘 Buttons Utility
 * Inline keyboard button generators
 */

const { isOwner } = require('../config/owner');

/**
 * Get main menu buttons
 * @param {number} userId 
 * @returns {Array}
 */
function getMainMenu(userId) {
    const buttons = [
        [{ text: '🎬 Video Download', callback_data: 'video_download' }],
        [{ text: '🎵 YouTube to MP3', callback_data: 'audio_download' }],
        [{ text: '🔍 Song by Name', callback_data: 'song_search' }],
        [{ text: '🖼️ Thumbnail Download', callback_data: 'thumbnail_download' }],
        [{ text: 'ℹ️ About', callback_data: 'about' }]
    ];

    // Add settings button for owner only
    if (isOwner(userId)) {
        buttons.push([{ text: '⚙️ Settings', callback_data: 'settings' }]);
    }

    return buttons;
}

/**
 * Get cancel button
 * @returns {Array}
 */
function getCancelButton() {
    return [[{ text: '❌ Cancel', callback_data: 'cancel' }]];
}

/**
 * Get video quality buttons based on available formats
 * @param {Array} formats 
 * @returns {Array}
 */
function getVideoQualityButtons(formats) {
    const standardQualities = ['144p', '240p', '360p', '480p', '720p', '1080p', '1440p', '2160p'];
    const availableQualities = formats.map(f => f.quality);
    
    const buttons = [];
    let row = [];

    standardQualities.forEach(quality => {
        if (availableQualities.includes(quality)) {
            row.push({
                text: `📹 ${quality}`,
                callback_data: `vq_${quality}`
            });

            if (row.length === 2) {
                buttons.push(row);
                row = [];
            }
        }
    });

    if (row.length > 0) {
        buttons.push(row);
    }

    // Add cancel button
    buttons.push([{ text: '❌ Cancel', callback_data: 'cancel' }]);

    return buttons;
}

/**
 * Get audio quality buttons
 * @returns {Array}
 */
function getAudioQualityButtons() {
    return [
        [
            { text: '🎧 64 kbps', callback_data: 'aq_64' },
            { text: '🎧 128 kbps', callback_data: 'aq_128' }
        ],
        [
            { text: '🎧 192 kbps', callback_data: 'aq_192' },
            { text: '🎧 320 kbps', callback_data: 'aq_320' }
        ],
        [{ text: '❌ Cancel', callback_data: 'cancel' }]
    ];
}

/**
 * Get song audio quality buttons
 * @returns {Array}
 */
function getSongAudioQualityButtons() {
    return [
        [
            { text: '🎧 64 kbps', callback_data: 'saq_64' },
            { text: '🎧 128 kbps', callback_data: 'saq_128' }
        ],
        [
            { text: '🎧 192 kbps', callback_data: 'saq_192' },
            { text: '🎧 320 kbps', callback_data: 'saq_320' }
        ],
        [{ text: '❌ Cancel', callback_data: 'cancel' }]
    ];
}

/**
 * Get song search result buttons
 * @param {Array} results 
 * @param {number} startIndex 
 * @param {boolean} hasMore 
 * @returns {Array}
 */
function getSongResultButtons(results, startIndex = 0, hasMore = true) {
    const buttons = results.map((result, idx) => {
        const globalIndex = startIndex + idx;
        const title = result.title.length > 40 
            ? result.title.substring(0, 40) + '...' 
            : result.title;
        
        return [{
            text: `🎵 ${title}`,
            callback_data: `song_${globalIndex}`
        }];
    });

    // Add more button if there are more results
    if (hasMore) {
        buttons.push([{ text: '➕ More Results', callback_data: 'more_results' }]);
    }

    // Add cancel button
    buttons.push([{ text: '❌ Cancel', callback_data: 'cancel' }]);

    return buttons;
}

/**
 * Get thumbnail quality buttons
 * @returns {Array}
 */
function getThumbnailQualityButtons() {
    return [
        [
            { text: '📷 Default', callback_data: 'thumb_default' },
            { text: '📷 Medium', callback_data: 'thumb_medium' }
        ],
        [
            { text: '📷 High', callback_data: 'thumb_high' },
            { text: '📷 Max Res', callback_data: 'thumb_max' }
        ],
        [{ text: '❌ Cancel', callback_data: 'cancel' }]
    ];
}

/**
 * Get settings buttons
 * @param {number} currentTime 
 * @returns {Array}
 */
function getSettingsButtons(currentTime) {
    const times = [1, 2, 3, 5, 10];
    
    const buttons = times.map(time => {
        const isSelected = time === currentTime;
        return [{
            text: `${isSelected ? '✅' : '⏱️'} ${time} minute${time > 1 ? 's' : ''}`,
            callback_data: `autodelete_${time}`
        }];
    });

    buttons.push([{ text: '🏠 Back to Menu', callback_data: 'main_menu' }]);

    return buttons;
}

module.exports = {
    getMainMenu,
    getCancelButton,
    getVideoQualityButtons,
    getAudioQualityButtons,
    getSongAudioQualityButtons,
    getSongResultButtons,
    getThumbnailQualityButtons,
    getSettingsButtons
};