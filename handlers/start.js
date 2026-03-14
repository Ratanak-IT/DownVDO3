/**
 * 🎯 Start Handler — with Language Selection
 */

const { getUserLang, t } = require('../utils/lang');
const buttons = require('../utils/buttons');

async function handleStart(bot, msg, userStates) {
    const chatId  = msg.chat.id;
    const userId  = msg.from.id;
    const name    = msg.from.first_name || 'there';
    const lang    = getUserLang(userId);

    userStates.delete(chatId);

    // Show welcome + language picker first
    await bot.sendMessage(chatId,
        `👋 Hey <b>${name}</b>!\n\n🌐 Please choose your language / ជ្រើសរើសភាសារបស់អ្នក:`,
        {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🌐 English',  callback_data: 'set_lang_en' },
                        { text: '🇰🇭 ខ្មែរ',    callback_data: 'set_lang_km' },
                    ]
                ]
            }
        }
    );
}

module.exports = { handleStart };