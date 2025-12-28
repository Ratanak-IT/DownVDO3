/**
 * ⚙️ Settings Handler
 * Manages owner-only settings menu
 */

const { isOwner, getAutoDeleteMinutes, setAutoDeleteMinutes } = require('../config/owner');
const buttons = require('../utils/buttons');

/**
 * Show settings menu
 * @param {TelegramBot} bot 
 * @param {number} chatId 
 */
async function showSettings(bot, chatId) {
    const currentTime = getAutoDeleteMinutes();
    
    const settingsText = `⚙️ <b>Bot Settings</b>\n\n` +
        `🧹 <b>Auto Delete Files:</b> ${currentTime} minutes\n\n` +
        `Select auto-delete time for downloaded files:`;

    const settingsButtons = buttons.getSettingsButtons(currentTime);

    await bot.sendMessage(chatId, settingsText, {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: settingsButtons
        }
    });
}

/**
 * Handle auto-delete time selection
 * @param {TelegramBot} bot 
 * @param {CallbackQuery} query 
 */
async function handleAutoDelete(bot, query) {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const minutes = parseInt(query.data.replace('autodelete_', ''));

    // Update setting
    setAutoDeleteMinutes(minutes);

    // Update message
    const settingsText = `⚙️ <b>Bot Settings</b>\n\n` +
        `🧹 <b>Auto Delete Files:</b> ${minutes} minutes\n\n` +
        `✅ Setting updated successfully!`;

    const settingsButtons = buttons.getSettingsButtons(minutes);

    await bot.editMessageText(settingsText, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: settingsButtons
        }
    });

    await bot.answerCallbackQuery(query.id, {
        text: `✅ Auto-delete set to ${minutes} minutes`,
        show_alert: false
    });
}

module.exports = {
    showSettings,
    handleAutoDelete
};