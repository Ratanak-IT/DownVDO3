/**
 * ℹ️ About Handler
 * Shows bot information to users
 */

const buttons = require('../utils/buttons');

/**
 * Show about page
 * @param {TelegramBot} bot 
 * @param {number} chatId 
 */
async function showAbout(bot, chatId) {
    const aboutText = `
ℹ️ <b>About This Bot</b>

🎬 <b>YouTube Downloader Bot</b>

This bot helps you download YouTube content easily:

📥 <b>Features:</b>
• Download videos in multiple qualities
• Convert YouTube videos to MP3
• Search songs by name
• Download video thumbnails

🔒 <b>Privacy:</b>
• Files are automatically deleted after processing
• No personal data is stored
• Your downloads are private

⚡ <b>Tips:</b>
• Use public/unlisted videos for best results
• Higher quality = larger file size
• Be patient with large files

💝 Made with love for music & video lovers

🔗 <b>Powered by:</b> yt-dlp
`;

    await bot.sendMessage(chatId, aboutText, {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🏠 Back to Menu', callback_data: 'main_menu' }]
            ]
        }
    });
}

module.exports = { showAbout };