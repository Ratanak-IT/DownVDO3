/**
 * 🌐 Language Utility
 * Supports English (en) and Khmer (km)
 */

// In-memory store for user language preferences
// { userId: 'en' or 'km' }
const userLanguages = new Map();

/**
 * Get user's language (default: English)
 */
function getUserLang(userId) {
    return userLanguages.get(userId) || 'en';
}

/**
 * Set user's language
 */
function setUserLang(userId, lang) {
    userLanguages.set(userId, lang);
}

/**
 * All translations
 */
const T = {

    // ── Welcome ────────────────────────────────────────────────────────────────
    welcome: {
        en: (name) => `👋 Hey <b>${name}</b>!\n\nWelcome to <b>YouTube Downloader Bot</b> 🎬\n\nI can download videos, convert to MP3, search songs, and more!\n\nChoose an option below 👇`,
        km: (name) => `👋 សួស្តី <b>${name}</b>!\n\nស្វាគមន៍មក <b>YouTube Downloader Bot</b> 🎬\n\nខ្ញុំអាចទាញយកវីដេអូ, បំលែងជា MP3, ស្វែងរកបទ, និងច្រើនទៀត!\n\nជ្រើសរើសខាងក្រោម 👇`,
    },

    // ── Menu ───────────────────────────────────────────────────────────────────
    menu: {
        en: () => `🏠 <b>Main Menu</b>\n\nWhat would you like to do?`,
        km: () => `🏠 <b>ម៉ឺនុយសំខាន់</b>\n\nតើអ្នកចង់ធ្វើអ្វី?`,
    },

    // ── Buttons ────────────────────────────────────────────────────────────────
    btn_video: {
        en: '🎬 Video Download',
        km: '🎬 ទាញយកវីដេអូ',
    },
    btn_audio: {
        en: '🎵 YouTube to MP3',
        km: '🎵 YouTube ទៅ MP3',
    },
    btn_song: {
        en: '🔍 Song by Name',
        km: '🔍 ស្វែងរកបទ',
    },
    btn_thumbnail: {
        en: '🖼️ Thumbnail Download',
        km: '🖼️ ទាញយក Thumbnail',
    },
    btn_about: {
        en: 'ℹ️ About',
        km: 'ℹ️ អំពី Bot',
    },
    // ── TikTok ─────────────────────────────────────────────────────────────────
    btn_tiktok: {
        en: '🎵 TikTok',
        km: '🎵 TikTok',
    },
    btn_tiktok_video: {
        en: '📹 Video (No Watermark)',
        km: '📹 វីដេអូ (គ្មាន Watermark)',
    },
    btn_tiktok_mp3: {
        en: '🎵 MP3',
        km: '🎵 MP3',
    },
    tiktok_choose_type: {
        en: `🎵 <b>TikTok Downloader</b>\n\nWhat would you like to download?`,
        km: `🎵 <b>ទាញយក TikTok</b>\n\nចង់ទាញយកអ្វី?`,
    },
    ask_tiktok_video_url: {
        en: `📹 <b>TikTok Video</b>\n\nSend me a TikTok link 🔗\n\nSupported:\n• tiktok.com/@user/video/...\n• vm.tiktok.com/...\n• vt.tiktok.com/...`,
        km: `📹 <b>វីដេអូ TikTok</b>\n\nសូមផ្ញើ link TikTok 🔗\n\nគាំទ្រ:\n• tiktok.com/@user/video/...\n• vm.tiktok.com/...\n• vt.tiktok.com/...`,
    },
    ask_tiktok_mp3_url: {
        en: `🎵 <b>TikTok to MP3</b>\n\nSend me a TikTok link 🔗\n\nSupported:\n• tiktok.com/@user/video/...\n• vm.tiktok.com/...\n• vt.tiktok.com/...`,
        km: `🎵 <b>TikTok ទៅ MP3</b>\n\nសូមផ្ញើ link TikTok 🔗\n\nគាំទ្រ:\n• tiktok.com/@user/video/...\n• vm.tiktok.com/...\n• vt.tiktok.com/...`,
    },
    invalid_tiktok_url: {
        en: `❌ <b>Invalid URL</b>\n\nPlease send a valid TikTok link.\n\nSupported:\n• tiktok.com/@user/video/...\n• vm.tiktok.com/...\n• vt.tiktok.com/...`,
        km: `❌ <b>Link មិនត្រឹមត្រូវ</b>\n\nសូមផ្ញើ link TikTok ត្រឹមត្រូវ។\n\nគាំទ្រ:\n• tiktok.com/@user/video/...\n• vm.tiktok.com/...\n• vt.tiktok.com/...`,
    },
    btn_settings: {
        en: '⚙️ Settings',
        km: '⚙️ ការកំណត់',
    },
    btn_language: {
        en: '🌐 Language / ភាសា',
        km: '🌐 Language / ភាសា',
    },
    btn_cancel: {
        en: '❌ Cancel',
        km: '❌ បោះបង់',
    },
    btn_back: {
        en: '🏠 Back to Menu',
        km: '🏠 ត្រឡប់ Menu',
    },
    btn_more: {
        en: '➕ More Results',
        km: '➕ លទ្ធផលបន្ថែម',
    },

    // ── Ask URL ────────────────────────────────────────────────────────────────
    ask_video_url: {
        en: `🎬 <b>Video Download</b>\n\nPlease send me the YouTube video link 🔗`,
        km: `🎬 <b>ទាញយកវីដេអូ</b>\n\nសូមផ្ញើ link YouTube មកខ្ញុំ 🔗`,
    },
    ask_audio_url: {
        en: `🎵 <b>YouTube to MP3</b>\n\nPlease send me the YouTube video link 🔗`,
        km: `🎵 <b>YouTube ទៅ MP3</b>\n\nសូមផ្ញើ link YouTube មកខ្ញុំ 🔗`,
    },
    ask_song_name: {
        en: `🔍 <b>Song Search</b>\n\nSend me the song name or YouTube link 🎶`,
        km: `🔍 <b>ស្វែងរកបទ</b>\n\nផ្ញើឈ្មោះបទ ឬ link YouTube 🎶`,
    },
    ask_thumbnail_url: {
        en: `🖼️ <b>Thumbnail Download</b>\n\nPlease send me the YouTube video link 🔗`,
        km: `🖼️ <b>ទាញយក Thumbnail</b>\n\nសូមផ្ញើ link YouTube មកខ្ញុំ 🔗`,
    },

    // ── Errors ─────────────────────────────────────────────────────────────────
    invalid_url: {
        en: `❌ <b>Invalid URL</b>\n\nPlease send a valid YouTube link.\n\nSupported:\n• youtube.com/watch?v=...\n• youtu.be/...\n• youtube.com/shorts/...`,
        km: `❌ <b>Link មិនត្រឹមត្រូវ</b>\n\nសូមផ្ញើ link YouTube ត្រឹមត្រូវ។\n\nគាំទ្រ:\n• youtube.com/watch?v=...\n• youtu.be/...\n• youtube.com/shorts/...`,
    },
    session_expired: {
        en: `❌ Session expired. Please start again.`,
        km: `❌ Session អស់សុពលភាព។ សូមចាប់ផ្តើមម្តងទៀត។`,
    },
    error_generic: {
        en: `❌ Something went wrong. Please try again.`,
        km: `❌ មានបញ្ហាកើតឡើង។ សូមព្យាយាមម្តងទៀត។`,
    },
    no_results: {
        en: `😕 No results found. Try a different search.`,
        km: `😕 រកមិនឃើញលទ្ធផល។ សាកល្បងស្វែងរកផ្សេង។`,
    },

    // ── Progress ───────────────────────────────────────────────────────────────
    fetching_video: {
        en: `⏳ Fetching video details...`,
        km: `⏳ កំពុងទាញព័ត៌មានវីដេអូ...`,
    },
    fetching_audio: {
        en: `⏳ Fetching audio details...`,
        km: `⏳ កំពុងទាញព័ត៌មាន audio...`,
    },
    fetching_thumbnail: {
        en: `⏳ Fetching thumbnail options...`,
        km: `⏳ កំពុងទាញ thumbnail...`,
    },
    searching: {
        en: `🔍 Searching for songs...`,
        km: `🔍 កំពុងស្វែងរកបទ...`,
    },
    downloading_video: {
        en: `⏳ <b>Downloading video...</b>\n\nPlease wait, this may take a moment.`,
        km: `⏳ <b>កំពុងទាញយកវីដេអូ...</b>\n\nសូមរង់ចាំ។`,
    },
    downloading_audio: {
        en: `⏳ <b>Downloading audio...</b>\n\nPlease wait, this may take a moment.`,
        km: `⏳ <b>កំពុងទាញយក audio...</b>\n\nសូមរង់ចាំ។`,
    },
    processing: {
        en: `🔄 <b>Processing file...</b>\n\nAlmost there!`,
        km: `🔄 <b>កំពុង process ឯកសារ...</b>\n\nជិតដល់ហើយ!`,
    },
    uploading: {
        en: `📤 <b>Uploading to Telegram...</b>\n\nYour file will be ready soon!`,
        km: `📤 <b>កំពុង upload ទៅ Telegram...</b>\n\nឯកសាររបស់អ្នកនឹងរួចរាល់ឆាប់ៗ!`,
    },
    downloading_thumb: {
        en: `⏳ Downloading thumbnail...`,
        km: `⏳ កំពុងទាញយក thumbnail...`,
    },
    uploading_thumb: {
        en: `📤 Uploading thumbnail...`,
        km: `📤 កំពុង upload thumbnail...`,
    },

    // ── Success ────────────────────────────────────────────────────────────────
    download_success: {
        en: `✅ <b>Download Complete!</b>\n\nYour file is ready 🎉`,
        km: `✅ <b>ទាញយករួចរាល់!</b>\n\nឯកសាររបស់អ្នករួចរាល់ហើយ 🎉`,
    },
    thumb_not_max: {
        en: `📝 Max resolution not available, using high quality.`,
        km: `📝 Max resolution មិនមាន, ប្រើ high quality វិញ។`,
    },

    // ── Select quality ─────────────────────────────────────────────────────────
    select_video_quality: {
        en: `Select video quality 👇`,
        km: `ជ្រើសរើស quality វីដេអូ 👇`,
    },
    select_audio_quality: {
        en: `Select audio quality 👇`,
        km: `ជ្រើសរើស quality audio 👇`,
    },
    select_thumbnail_quality: {
        en: `Select thumbnail quality 👇`,
        km: `ជ្រើសរើស quality thumbnail 👇`,
    },
    search_results: {
        en: (q) => `🔍 Search results for: <b>${q}</b>\n\nSelect a song to download 👇`,
        km: (q) => `🔍 លទ្ធផលស្វែងរក: <b>${q}</b>\n\nជ្រើសរើសបទ 👇`,
    },

    // ── Language screen ────────────────────────────────────────────────────────
    choose_language: {
        en: `🌐 Choose your language / ជ្រើសរើសភាសារបស់អ្នក:`,
        km: `🌐 ជ្រើសរើសភាសារបស់អ្នក / Choose your language:`,
    },
    language_set_en: {
        en: `✅ Language set to English!`,
        km: `✅ Language set to English!`,
    },
    language_set_km: {
        en: `✅ ភាសាត្រូវបានកំណត់ជាខ្មែរ!`,
        km: `✅ ភាសាត្រូវបានកំណត់ជាខ្មែរ!`,
    },

    // ── About ──────────────────────────────────────────────────────────────────
    about: {
        en: `ℹ️ <b>About This Bot</b>\n\n🎬 <b>YouTube Downloader Bot</b>\n\n📥 <b>Features:</b>\n• Download videos (144p → 4K)\n• Convert to MP3 (64-320 kbps)\n• Search songs by name\n• Download thumbnails\n\n🔒 Files are auto-deleted after use.\n\n💝 Powered by yt-dlp`,
        km: `ℹ️ <b>អំពី Bot នេះ</b>\n\n🎬 <b>YouTube Downloader Bot</b>\n\n📥 <b>មុខងារ:</b>\n• ទាញយកវីដេអូ (144p → 4K)\n• បំលែងជា MP3 (64-320 kbps)\n• ស្វែងរកបទតាមឈ្មោះ\n• ទាញយក thumbnail\n\n🔒 ឯកសារត្រូវបានលុបដោយស្វ័យប្រវត្តិ។\n\n💝 ដំណើរការដោយ yt-dlp`,
    },

    // ── Settings ───────────────────────────────────────────────────────────────
    settings: {
        en: (min) => `⚙️ <b>Bot Settings</b>\n\n🧹 <b>Auto Delete Files:</b> ${min} minutes\n\nSelect auto-delete time:`,
        km: (min) => `⚙️ <b>ការកំណត់ Bot</b>\n\n🧹 <b>លុបឯកសារស្វ័យប្រវត្តិ:</b> ${min} នាទី\n\nជ្រើសរើសពេលវេលា:`,
    },
    settings_updated: {
        en: (min) => `⚙️ <b>Bot Settings</b>\n\n🧹 <b>Auto Delete Files:</b> ${min} minutes\n\n✅ Setting updated!`,
        km: (min) => `⚙️ <b>ការកំណត់ Bot</b>\n\n🧹 <b>លុបឯកសារស្វ័យប្រវត្តិ:</b> ${min} នាទី\n\n✅ បានអាប់ដេតហើយ!`,
    },
    already_set: {
        en: (min) => `Already set to ${min} minutes`,
        km: (min) => `បានកំណត់ ${min} នាទីហើយ`,
    },
};

/**
 * Get translation
 * @param {string} key
 * @param {string} lang - 'en' or 'km'
 * @param {...any} args - optional args for function translations
 */
function t(key, lang, ...args) {
    const entry = T[key];
    if (!entry) return `[Missing: ${key}]`;
    const val = entry[lang] || entry['en'];
    if (typeof val === 'function') return val(...args);
    return val;
}

module.exports = { t, getUserLang, setUserLang };