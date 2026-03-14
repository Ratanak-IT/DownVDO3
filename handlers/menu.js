/**
 * 📱 Menu Handler
 */

const { getUserLang, t } = require('../utils/lang');
const buttons = require('../utils/buttons');

async function showMainMenu(bot, chatId, userId) {
    const lang = getUserLang(userId);
    await bot.sendMessage(chatId, t('menu', lang), {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buttons.getMainMenu(userId, lang) }
    });
}

async function editToMainMenu(bot, chatId, messageId, userId) {
    const lang = getUserLang(userId);
    try {
        await bot.editMessageText(t('menu', lang), {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: buttons.getMainMenu(userId, lang) }
        });
    } catch (e) {
        await showMainMenu(bot, chatId, userId);
    }
}

module.exports = { showMainMenu, editToMainMenu };