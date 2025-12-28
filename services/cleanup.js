/**
 * 🧹 Cleanup Service
 * Manages automatic file deletion and cleanup
 */

const fs = require('fs');
const path = require('path');
const config = require('../config/env');
const { getAutoDeleteMinutes } = require('../config/owner');

// Store scheduled deletions
const scheduledDeletions = new Map();

/**
 * Schedule a file for deletion
 * @param {string} filePath 
 */
function scheduleDelete(filePath) {
    const deleteMinutes = getAutoDeleteMinutes();
    const deleteTime = deleteMinutes * 60 * 1000;

    const timeoutId = setTimeout(() => {
        deleteFile(filePath);
        scheduledDeletions.delete(filePath);
    }, deleteTime);

    scheduledDeletions.set(filePath, timeoutId);
    console.log(`📋 Scheduled deletion for ${path.basename(filePath)} in ${deleteMinutes} minutes`);
}

/**
 * Delete a file safely
 * @param {string} filePath 
 */
function deleteFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`🗑️ Deleted: ${path.basename(filePath)}`);
        }
    } catch (error) {
        console.error(`Failed to delete ${filePath}:`, error.message);
    }
}

/**
 * Cancel scheduled deletion
 * @param {string} filePath 
 */
function cancelDelete(filePath) {
    const timeoutId = scheduledDeletions.get(filePath);
    if (timeoutId) {
        clearTimeout(timeoutId);
        scheduledDeletions.delete(filePath);
    }
}

/**
 * Clean up old files in downloads directory
 */
function cleanupOldFiles() {
    const downloadPath = config.DOWNLOAD_PATH;
    const maxAgeMinutes = getAutoDeleteMinutes() * 2; // Keep files for 2x the auto-delete time max
    const maxAge = maxAgeMinutes * 60 * 1000;
    const now = Date.now();

    try {
        if (!fs.existsSync(downloadPath)) return;

        const files = fs.readdirSync(downloadPath);
        
        files.forEach(file => {
            const filePath = path.join(downloadPath, file);
            const stats = fs.statSync(filePath);
            const age = now - stats.mtimeMs;

            if (age > maxAge) {
                deleteFile(filePath);
            }
        });
    } catch (error) {
        console.error('Cleanup error:', error.message);
    }
}

/**
 * Start periodic cleanup scheduler
 */
function startCleanupScheduler() {
    // Run cleanup every 5 minutes
    setInterval(cleanupOldFiles, 5 * 60 * 1000);
    
    // Run initial cleanup
    cleanupOldFiles();
    
    console.log('🧹 Cleanup scheduler started');
}

/**
 * Get cleanup stats
 * @returns {Object}
 */
function getCleanupStats() {
    return {
        scheduledCount: scheduledDeletions.size,
        autoDeleteMinutes: getAutoDeleteMinutes()
    };
}

module.exports = {
    scheduleDelete,
    deleteFile,
    cancelDelete,
    cleanupOldFiles,
    startCleanupScheduler,
    getCleanupStats
};