/**
 * 🔘 Buttons Utility
 */

const { isOwner } = require('../config/owner');
const { t } = require('./lang');

function getMainMenu(userId, lang = 'en') {
    const btns = [
        [{ text: t('btn_video',     lang), callback_data: 'video_download'  },
         { text: t('btn_audio',     lang), callback_data: 'audio_download'  }],
        [{ text: t('btn_song',      lang), callback_data: 'song_search'     },
         { text: t('btn_thumbnail', lang), callback_data: 'thumbnail_download' }],
        [{ text: t('btn_tiktok',    lang), callback_data: 'tiktok'          }],
        [{ text: t('btn_language',  lang), callback_data: 'choose_language' },
         { text: t('btn_about',     lang), callback_data: 'about'           }],
    ];
    if (isOwner(userId)) {
        btns.push([{ text: t('btn_settings', lang), callback_data: 'settings' }]);
    }
    return btns;
}

function getCancelButton(lang = 'en') {
    return [[{ text: t('btn_cancel', lang), callback_data: 'cancel' }]];
}

function getBackButton(lang = 'en') {
    return [[{ text: t('btn_back', lang), callback_data: 'main_menu' }]];
}

function getVideoQualityButtons(formats, lang = 'en') {
    const standard = ['144p','240p','360p','480p','720p','1080p','1440p','2160p'];
    const available = formats.map(f => f.quality);
    const btns = [];
    let row = [];
    standard.forEach(q => {
        if (available.includes(q)) {
            row.push({ text: `📹 ${q}`, callback_data: `vq_${q}` });
            if (row.length === 2) { btns.push(row); row = []; }
        }
    });
    if (row.length > 0) btns.push(row);
    btns.push([{ text: t('btn_cancel', lang), callback_data: 'cancel' }]);
    return btns;
}

// TikTok video quality buttons — uses tvq_ prefix to separate from YouTube
function getTikTokVideoQualityButtons(formats, lang = 'en') {
    const standard = ['144p','240p','360p','480p','720p','1080p','1440p','2160p'];
    const available = formats.map(f => f.quality);
    const btns = [];
    let row = [];
    standard.forEach(q => {
        if (available.includes(q)) {
            row.push({ text: `📹 ${q}`, callback_data: `tvq_${q}` });
            if (row.length === 2) { btns.push(row); row = []; }
        }
    });
    if (row.length > 0) btns.push(row);
    btns.push([{ text: t('btn_cancel', lang), callback_data: 'cancel' }]);
    return btns;
}

function getAudioQualityButtons(lang = 'en') {
    return [
        [{ text: '🎧 64 kbps',  callback_data: 'aq_64'  },
         { text: '🎧 128 kbps', callback_data: 'aq_128' }],
        [{ text: '🎧 192 kbps', callback_data: 'aq_192' },
         { text: '🎧 320 kbps', callback_data: 'aq_320' }],
        [{ text: t('btn_cancel', lang), callback_data: 'cancel' }],
    ];
}

// TikTok audio quality buttons — uses taq_ prefix
function getTikTokAudioQualityButtons(lang = 'en') {
    return [
        [{ text: '🎧 64 kbps',  callback_data: 'taq_64'  },
         { text: '🎧 128 kbps', callback_data: 'taq_128' }],
        [{ text: '🎧 192 kbps', callback_data: 'taq_192' },
         { text: '🎧 320 kbps', callback_data: 'taq_320' }],
        [{ text: t('btn_cancel', lang), callback_data: 'cancel' }],
    ];
}

function getSongAudioQualityButtons(lang = 'en') {
    return [
        [{ text: '🎧 64 kbps',  callback_data: 'saq_64'  },
         { text: '🎧 128 kbps', callback_data: 'saq_128' }],
        [{ text: '🎧 192 kbps', callback_data: 'saq_192' },
         { text: '🎧 320 kbps', callback_data: 'saq_320' }],
        [{ text: t('btn_cancel', lang), callback_data: 'cancel' }],
    ];
}

function getSongResultButtons(results, startIndex = 0, hasMore = true, lang = 'en') {
    const btns = results.map((r, i) => {
        const title = r.title.length > 40 ? r.title.substring(0, 40) + '...' : r.title;
        return [{ text: `🎵 ${title}`, callback_data: `song_${startIndex + i}` }];
    });
    if (hasMore) btns.push([{ text: t('btn_more', lang), callback_data: 'more_results' }]);
    btns.push([{ text: t('btn_cancel', lang), callback_data: 'cancel' }]);
    return btns;
}

function getThumbnailQualityButtons(lang = 'en') {
    return [
        [{ text: '📷 Default', callback_data: 'thumb_default' },
         { text: '📷 Medium',  callback_data: 'thumb_medium'  }],
        [{ text: '📷 High',    callback_data: 'thumb_high'    },
         { text: '📷 Max Res', callback_data: 'thumb_max'     }],
        [{ text: t('btn_cancel', lang), callback_data: 'cancel' }],
    ];
}

function getSettingsButtons(currentTime, lang = 'en') {
    const times = [1, 2, 3, 5, 10];
    const btns = times.map(m => [{
        text: `${m === currentTime ? '✅' : '⏱️'} ${m} min${m > 1 ? 's' : ''}`,
        callback_data: `autodelete_${m}`
    }]);
    btns.push([{ text: t('btn_back', lang), callback_data: 'main_menu' }]);
    return btns;
}

function getLanguageButtons() {
    return [[
        { text: '🌐 English', callback_data: 'set_lang_en' },
        { text: '🇰🇭 ខ្មែរ',   callback_data: 'set_lang_km' },
    ]];
}

module.exports = {
    getMainMenu,
    getCancelButton,
    getBackButton,
    getVideoQualityButtons,
    getTikTokVideoQualityButtons,
    getAudioQualityButtons,
    getTikTokAudioQualityButtons,
    getSongAudioQualityButtons,
    getSongResultButtons,
    getThumbnailQualityButtons,
    getSettingsButtons,
    getLanguageButtons,
};