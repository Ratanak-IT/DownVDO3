/**
 * 🎯 Start Handler
 * Handles /start command and welcome flow
 */

const messages = require('../utils/messages');
const buttons = require('../utils/buttons');

/**
 * Handle /start command
 * @param {TelegramBot} bot 
 * @param {Message} msg 
 * @param {Map} userStates 
 */
async function handleStart(bot, msg, userStates) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const firstName = msg.from.first_name || 'there';

    // Clear any existing user state
    userStates.delete(chatId);

    // Send welcome message with main menu
    const welcomeText = messages.getWelcome(firstName);
    const menuButtons = buttons.getMainMenu(userId);

    await bot.sendMessage(chatId, welcomeText, {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: menuButtons
        }
    });
}

module.exports = { handleStart };