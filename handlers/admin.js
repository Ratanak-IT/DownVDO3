/**
 * 👑 Admin Handler
 * Commands: /admin, /message, /stats, /users, /broadcast
 * Only accessible by ADMIN_ID in .env
 */

const fs = require('fs');
const path = require('path');
const { getUserLang, t, setUserLang } = require('../utils/lang');

// ── In-memory stats (resets on restart) ───────────────────────────────────────
const stats = {
    totalDownloads:  0,
    videoDownloads:  0,
    audioDownloads:  0,
    songDownloads:   0,
    thumbDownloads:  0,
    failedDownloads: 0,
    startTime:       Date.now(),
};

// ── User registry (persisted in users.json) ────────────────────────────────────
const USERS_FILE = path.join(__dirname, '../data/users.json');

function loadUsers() {
    try {
        if (!fs.existsSync(path.dirname(USERS_FILE))) {
            fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
        }
        if (!fs.existsSync(USERS_FILE)) return {};
        return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    } catch { return {}; }
}

function saveUsers(users) {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    } catch (e) {
        console.error('Failed to save users:', e.message);
    }
}

function registerUser(userId, firstName, lang) {
    const users = loadUsers();
    if (!users[userId]) {
        users[userId] = {
            id:         userId,
            firstName:  firstName || 'Unknown',
            lang:       lang || 'en',
            joinedAt:   new Date().toISOString(),
            downloads:  0,
            lastActive: new Date().toISOString(),
        };
    } else {
        users[userId].lang       = lang || users[userId].lang;
        users[userId].lastActive = new Date().toISOString();
        users[userId].firstName  = firstName || users[userId].firstName;
    }
    saveUsers(users);
}

function incrementUserDownload(userId) {
    const users = loadUsers();
    if (users[userId]) {
        users[userId].downloads  = (users[userId].downloads || 0) + 1;
        users[userId].lastActive = new Date().toISOString();
        saveUsers(users);
    }
}

// ── Check admin ────────────────────────────────────────────────────────────────
function isAdmin(userId) {
    const adminId = parseInt(process.env.ADMIN_ID || process.env.OWNER_ID || '0');
    return userId === adminId;
}

// ── Uptime formatter ───────────────────────────────────────────────────────────
function getUptime() {
    const ms      = Date.now() - stats.startTime;
    const hours   = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
}

// ── /admin ─────────────────────────────────────────────────────────────────────
async function adminCommand(bot, msg) {
    const userId = msg.from.id;
    if (!isAdmin(userId)) {
        await bot.sendMessage(msg.chat.id, '❌ You are not authorized.');
        return;
    }

    const users     = loadUsers();
    const userList  = Object.values(users);
    const totalUsers = userList.length;
    const enUsers   = userList.filter(u => u.lang === 'en').length;
    const kmUsers   = userList.filter(u => u.lang === 'km').length;
    const totalDL   = userList.reduce((sum, u) => sum + (u.downloads || 0), 0);

    // Downloads folder size
    let folderSize = '0 MB';
    try {
        const dlPath = process.env.DOWNLOAD_PATH || './downloads';
        if (fs.existsSync(dlPath)) {
            const files = fs.readdirSync(dlPath);
            const size  = files.reduce((sum, f) => {
                try { return sum + fs.statSync(path.join(dlPath, f)).size; } catch { return sum; }
            }, 0);
            folderSize = (size / (1024 * 1024)).toFixed(1) + ' MB';
        }
    } catch {}

    const dashboard = `
👑 <b>Admin Dashboard</b>
━━━━━━━━━━━━━━━━━━━━

👥 <b>Users</b>
  • Total Users:     <b>${totalUsers}</b>
  • 🌐 English:      <b>${enUsers}</b>
  • 🇰🇭 Khmer:       <b>${kmUsers}</b>

📥 <b>Downloads (this session)</b>
  • Total:           <b>${stats.totalDownloads}</b>
  • 🎬 Video:        <b>${stats.videoDownloads}</b>
  • 🎵 Audio/MP3:    <b>${stats.audioDownloads}</b>
  • 🔍 Song Search:  <b>${stats.songDownloads}</b>
  • 🖼️ Thumbnail:    <b>${stats.thumbDownloads}</b>
  • ❌ Failed:       <b>${stats.failedDownloads}</b>
  • 📊 All-time DL:  <b>${totalDL}</b>

💾 <b>Storage</b>
  • Downloads Folder: <b>${folderSize}</b>

⏱️ <b>Uptime:</b> <b>${getUptime()}</b>

━━━━━━━━━━━━━━━━━━━━
<b>Admin Commands:</b>
/admin — Dashboard
/users — User list
/message [text] — Broadcast
/stats — Quick stats
/cleardownloads — Clear temp files
`.trim();

    await bot.sendMessage(msg.chat.id, dashboard, {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: '👥 User List',       callback_data: 'admin_users'    },
                 { text: '📊 Quick Stats',     callback_data: 'admin_stats'    }],
                [{ text: '📢 Broadcast',       callback_data: 'admin_broadcast'},
                 { text: '🗑️ Clear Downloads', callback_data: 'admin_clear'   }],
                [{ text: '🔄 Refresh',         callback_data: 'admin_refresh'  }],
            ]
        }
    });
}

// ── /users ─────────────────────────────────────────────────────────────────────
async function usersCommand(bot, msg) {
    const userId = msg.from.id;
    if (!isAdmin(userId)) return;

    const users    = loadUsers();
    const userList = Object.values(users)
        .sort((a, b) => (b.downloads || 0) - (a.downloads || 0))
        .slice(0, 20); // Show top 20

    if (userList.length === 0) {
        await bot.sendMessage(msg.chat.id, '📭 No users registered yet.'); return;
    }

    let text = `👥 <b>User List (Top 20 by downloads)</b>\n\n`;
    userList.forEach((u, i) => {
        const flag = u.lang === 'km' ? '🇰🇭' : '🌐';
        const joined = u.joinedAt ? u.joinedAt.split('T')[0] : 'Unknown';
        text += `${i + 1}. ${flag} <b>${escapeHtml(u.firstName)}</b>\n`;
        text += `    📥 Downloads: ${u.downloads || 0} | Joined: ${joined}\n\n`;
    });

    await bot.sendMessage(msg.chat.id, text, { parse_mode: 'HTML' });
}

// ── /message ───────────────────────────────────────────────────────────────────
async function messageCommand(bot, msg) {
    const userId = msg.from.id;
    if (!isAdmin(userId)) {
        await bot.sendMessage(msg.chat.id, '❌ You are not authorized.'); return;
    }

    // Get text after /message
    const text = msg.text.replace(/^\/message\s*/i, '').trim();

    if (!text) {
        await bot.sendMessage(msg.chat.id,
            '⚠️ <b>Usage:</b> /message Your message here\n\n' +
            'Example:\n<code>/message Bot has been updated! 🎉</code>',
            { parse_mode: 'HTML' }
        );
        return;
    }

    const users    = loadUsers();
    const userList = Object.values(users);

    if (userList.length === 0) {
        await bot.sendMessage(msg.chat.id, '📭 No users to send to.'); return;
    }

    const progressMsg = await bot.sendMessage(msg.chat.id,
        `📡 Sending to ${userList.length} users...`
    );

    let sent = 0, failed = 0;

    for (const user of userList) {
        try {
            const lang   = user.lang || 'en';
            const prefix = lang === 'km'
                ? '📢 <b>សារពី Admin</b>\n\n'
                : '📢 <b>Message from Admin</b>\n\n';

            await bot.sendMessage(user.id, prefix + text, { parse_mode: 'HTML' });
            sent++;
            // Small delay to avoid Telegram flood limit
            await sleep(50);
        } catch (e) {
            failed++;
            console.error(`Failed to send to ${user.id}:`, e.message);
        }
    }

    await bot.editMessageText(
        `✅ <b>Broadcast Complete!</b>\n\n` +
        `📤 Sent:   <b>${sent}</b>\n` +
        `❌ Failed: <b>${failed}</b>\n` +
        `👥 Total:  <b>${userList.length}</b>`,
        {
            chat_id:    msg.chat.id,
            message_id: progressMsg.message_id,
            parse_mode: 'HTML'
        }
    );
}

// ── /stats (quick) ─────────────────────────────────────────────────────────────
async function statsCommand(bot, msg) {
    const userId = msg.from.id;
    if (!isAdmin(userId)) return;

    const text =
        `📊 <b>Quick Stats</b>\n\n` +
        `🎬 Video: <b>${stats.videoDownloads}</b>\n` +
        `🎵 Audio: <b>${stats.audioDownloads}</b>\n` +
        `🔍 Song:  <b>${stats.songDownloads}</b>\n` +
        `🖼️ Thumb: <b>${stats.thumbDownloads}</b>\n` +
        `❌ Failed: <b>${stats.failedDownloads}</b>\n` +
        `⏱️ Uptime: <b>${getUptime()}</b>`;

    await bot.sendMessage(msg.chat.id, text, { parse_mode: 'HTML' });
}

// ── /cleardownloads ────────────────────────────────────────────────────────────
async function clearDownloadsCommand(bot, msg) {
    const userId = msg.from.id;
    if (!isAdmin(userId)) return;

    try {
        const dlPath = process.env.DOWNLOAD_PATH || './downloads';
        let count = 0;
        if (fs.existsSync(dlPath)) {
            const files = fs.readdirSync(dlPath);
            files.forEach(f => {
                try { fs.unlinkSync(path.join(dlPath, f)); count++; } catch {}
            });
        }
        await bot.sendMessage(msg.chat.id, `✅ Cleared <b>${count}</b> files from downloads folder.`, { parse_mode: 'HTML' });
    } catch (e) {
        await bot.sendMessage(msg.chat.id, `❌ Error: ${e.message}`);
    }
}

// ── Admin Callbacks ────────────────────────────────────────────────────────────
async function handleAdminCallback(bot, query) {
    const userId = query.from.id;
    const chatId = query.message.chat.id;
    const data   = query.data;

    if (!isAdmin(userId)) {
        await bot.answerCallbackQuery(query.id, { text: '❌ Not authorized', show_alert: true });
        return;
    }

    await bot.answerCallbackQuery(query.id);

    if (data === 'admin_refresh') {
        await adminCommand(bot, { from: { id: userId }, chat: { id: chatId } });
    } else if (data === 'admin_users') {
        await usersCommand(bot, { from: { id: userId }, chat: { id: chatId } });
    } else if (data === 'admin_stats') {
        await statsCommand(bot, { from: { id: userId }, chat: { id: chatId } });
    } else if (data === 'admin_clear') {
        await clearDownloadsCommand(bot, { from: { id: userId }, chat: { id: chatId } });
    } else if (data === 'admin_broadcast') {
        await bot.sendMessage(chatId,
            '📢 <b>Broadcast Message</b>\n\nUse:\n<code>/message Your message here</code>',
            { parse_mode: 'HTML' }
        );
    }
}

// ── Helper ─────────────────────────────────────────────────────────────────────
function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Export stats incrementers (called from other handlers) ─────────────────────
function incVideo()   { stats.totalDownloads++; stats.videoDownloads++;  }
function incAudio()   { stats.totalDownloads++; stats.audioDownloads++;  }
function incSong()    { stats.totalDownloads++; stats.songDownloads++;   }
function incThumb()   { stats.totalDownloads++; stats.thumbDownloads++;  }
function incFailed()  { stats.failedDownloads++; }

module.exports = {
    adminCommand,
    usersCommand,
    messageCommand,
    statsCommand,
    clearDownloadsCommand,
    handleAdminCallback,
    registerUser,
    incrementUserDownload,
    incVideo, incAudio, incSong, incThumb, incFailed,
    isAdmin,
};