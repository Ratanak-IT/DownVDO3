/**
 * 📱 Menu Handler
 * Manages main menu display and navigation
 */

const messages = require('../utils/messages');
const buttons = require('../utils/buttons');

/**
 * Show main menu (sends new message)
 * @param {TelegramBot} bot 
 * @param {number} chatId 
 * @param {number} userId 
 */
async function showMainMenu(bot, chatId, userId) {
    const menuText = messages.getMenuText();
    const menuButtons = buttons.getMainMenu(userId);

    await bot.sendMessage(chatId, menuText, {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: menuButtons
        }
    });
}

/**
 * Show main menu by editing existing message
 * @param {TelegramBot} bot 
 * @param {number} chatId 
 * @param {number} messageId 
 * @param {number} userId 
 */
async function editToMainMenu(bot, chatId, messageId, userId) {
    const menuText = messages.getMenuText();
    const menuButtons = buttons.getMainMenu(userId);

    try {
        await bot.editMessageText(menuText, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: menuButtons
            }
        });
    } catch (error) {
        // If edit fails, send new message
        await showMainMenu(bot, chatId, userId);
    }
}

module.exports = { showMainMenu, editToMainMenu };