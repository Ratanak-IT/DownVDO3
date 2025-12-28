# yt-dlp & FFmpeg Setup Guide (GitHub Codespaces / Ubuntu)

This guide contains **ready-to-use commands** for installing and using **yt-dlp** and **FFmpeg** for a **Telegram YouTube Downloader Bot**.

---

## 🔄 System Update

```bash
sudo apt update && sudo apt upgrade -y
```

---

## 🎥 Install yt-dlp (Recommended Method)

### Download Official Binary

```bash
sudo wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp
sudo chmod +x /usr/local/bin/yt-dlp
```

### Verify Installation

```bash
yt-dlp --version
```

---

## 🎵 Install FFmpeg

```bash
sudo apt install ffmpeg -y
```

### Verify Installation

```bash
ffmpeg -version
```

---

## 🍪 cookies.txt Setup (YouTube Auth)

1. Create cookies file in project root

```bash
touch cookies.txt
```

2. Export cookies using browser extension **"Get cookies.txt"**
3. Paste cookies into `cookies.txt`

### Add cookies.txt to .gitignore

```bash
echo "cookies.txt" >> .gitignore
```

---

## 🧪 Test yt-dlp with Cookies

```bash
yt-dlp --cookies cookies.txt https://www.youtube.com/watch?v=VIDEO_ID
```

---

## 🎬 Download YouTube Video (Quality Based)

Example: Download best video up to 720p

```bash
yt-dlp \
-f "bestvideo[height<=720]+bestaudio/best[height<=720]" \
--merge-output-format mp4 \
--cookies cookies.txt \
-o "downloads/%(title)s.%(ext)s" \
YOUTUBE_URL
```

---

## 🎵 Convert YouTube Video to MP3

```bash
yt-dlp \
-x --audio-format mp3 \
--audio-quality 0 \
--cookies cookies.txt \
-o "downloads/%(title)s.%(ext)s" \
YOUTUBE_URL
```

---

## 🖼️ Download Thumbnail Only

```bash
yt-dlp \
--skip-download \
--write-thumbnail \
--cookies cookies.txt \
-o "downloads/%(title)s" \
YOUTUBE_URL
```

---

## 🔍 Search Songs on YouTube (Top 5 Results)

```bash
yt-dlp "ytsearch5:SONG NAME HERE" --print "%(title)s"
```

---

## 🧹 Auto Delete Downloaded Files (Example)

Delete files older than 5 minutes:

```bash
find downloads/ -type f -mmin +5 -delete
```

Can be used in cron or background cleanup service.

---

## 🟢 Optional: Node.js Environment Check

```bash
node -v
npm -v
```

If Node.js is not installed:

```bash
sudo apt install nodejs npm -y
```

---

## ✅ Notes

* Always send files to Telegram as **DOCUMENT** to avoid quality loss
* Keep `cookies.txt` private
* Ensure FFmpeg is installed before audio conversion
* Suitable for GitHub Codespaces, VPS, and local Ubuntu setups

---

✨ Ready for bot development
