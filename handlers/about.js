/**
 * ℹ️ About Handler
 */
const { getUserLang, t } = require('../utils/lang');
const buttons = require('../utils/buttons');

async function showAbout(bot, chatId, lang) {
    lang = lang || getUserLang(chatId);
    await bot.sendMessage(chatId, t('about', lang), {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buttons.getBackButton(lang) }
    });
}

module.exports = { showAbout };