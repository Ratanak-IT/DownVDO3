/**
 * ⚙️ Settings Handler
 */
const { getAutoDeleteMinutes, setAutoDeleteMinutes } = require('../config/owner');
const { getUserLang, t } = require('../utils/lang');
const buttons = require('../utils/buttons');

async function showSettings(bot, chatId, lang) {
    lang = lang || getUserLang(chatId);
    const min = getAutoDeleteMinutes();
    await bot.sendMessage(chatId, t('settings', lang, min), {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buttons.getSettingsButtons(min, lang) }
    });
}

async function handleAutoDelete(bot, query, lang) {
    const chatId  = query.message.chat.id;
    const msgId   = query.message.message_id;
    const minutes = parseInt(query.data.replace('autodelete_', ''));
    const current = getAutoDeleteMinutes();
    lang = lang || getUserLang(query.from.id);

    if (minutes === current) {
        await bot.answerCallbackQuery(query.id, {
            text: t('already_set', lang, minutes), show_alert: false
        });
        return;
    }

    setAutoDeleteMinutes(minutes);
    try {
        await bot.editMessageText(t('settings_updated', lang, minutes), {
            chat_id: chatId, message_id: msgId, parse_mode: 'HTML',
            reply_markup: { inline_keyboard: buttons.getSettingsButtons(minutes, lang) }
        });
    } catch (e) {}

    await bot.answerCallbackQuery(query.id, {
        text: t('already_set', lang, minutes), show_alert: false
    });
}

module.exports = { showSettings, handleAutoDelete };