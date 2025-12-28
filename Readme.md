<div align="center">

# 🎬 Telegram YouTube Downloader Bot

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Telegram Bot API](https://img.shields.io/badge/Telegram-Bot%20API-26A5E4?style=for-the-badge&logo=telegram&logoColor=white)](https://core.telegram.org/bots/api)
[![yt-dlp](https://img.shields.io/badge/yt--dlp-Latest-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://github.com/yt-dlp/yt-dlp)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge)](CONTRIBUTING.md)

<img src="https://raw.githubusercontent.com/user/repo/main/assets/banner.png" alt="Bot Banner" width="600">

**A powerful, fast, and user-friendly Telegram bot for downloading YouTube videos, converting to MP3, searching songs, and fetching thumbnails.**

[Features](#-features) •
[Installation](#-installation) •
[Configuration](#-configuration) •
[Usage](#-usage) •
[Deployment](#-deployment) •
[FAQ](#-faq)

---

</div>

## 📑 Table of Contents

- [✨ Features](#-features)
- [📸 Screenshots](#-screenshots)
- [📋 Requirements](#-requirements)
- [🚀 Installation](#-installation)
  - [Windows](#-windows)
  - [Linux/Ubuntu](#-linuxubuntu)
  - [macOS](#-macos)
  - [Docker](#-docker)
- [⚙️ Configuration](#️-configuration)
- [🎮 Usage](#-usage)
- [☁️ VPS Deployment](#️-vps-deployment)
  - [DigitalOcean](#digitalocean)
  - [AWS EC2](#aws-ec2)
  - [Google Cloud](#google-cloud)
  - [Vultr](#vultr)
  - [Contabo](#contabo)
  - [Hetzner](#hetzner)
- [🔧 Troubleshooting](#-troubleshooting)
- [❓ FAQ](#-faq)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🎬 Video Download
- Multiple quality options (144p to 4K)
- Dynamic quality detection per video
- Sends as document (no quality loss)
- Progress tracking

</td>
<td width="50%">

### 🎵 YouTube to MP3
- Convert any YouTube video to MP3
- Multiple bitrates (64-320 kbps)
- High-quality audio extraction
- FFmpeg processing

</td>
</tr>
<tr>
<td width="50%">

### 🔍 Song Search
- Search songs by name
- Display top 5 results at a time
- "More" button for additional results
- Direct download from search

</td>
<td width="50%">

### 🖼️ Thumbnail Download
- Multiple quality options
- Default, Medium, High, Max Resolution
- Sends as document
- Fast download

</td>
</tr>
<tr>
<td width="50%">

### ⚙️ Owner Settings
- Auto-delete time configuration
- 1, 2, 3, 5, 10 minute options
- Server storage management
- Admin-only access

</td>
<td width="50%">

### 🔒 Security & Privacy
- Cookie support for restricted videos
- Automatic file cleanup
- No data logging
- Private downloads

</td>
</tr>
</table>

---

## 📸 Screenshots

<div align="center">
<table>
<tr>
<td align="center"><b>Main Menu</b></td>
<td align="center"><b>Video Download</b></td>
<td align="center"><b>Quality Selection</b></td>
</tr>
<tr>
<td><img src="https://via.placeholder.com/250x450/1a1a2e/eee?text=Main+Menu" alt="Main Menu"></td>
<td><img src="https://via.placeholder.com/250x450/1a1a2e/eee?text=Video+Download" alt="Video Download"></td>
<td><img src="https://via.placeholder.com/250x450/1a1a2e/eee?text=Quality+Selection" alt="Quality Selection"></td>
</tr>
</table>
</div>

---

## 📋 Requirements

| Requirement | Minimum Version | Recommended |
|-------------|-----------------|-------------|
| **Node.js** | 16.x | 18.x or 20.x |
| **npm** | 8.x | 9.x+ |
| **yt-dlp** | Latest | Latest |
| **FFmpeg** | 4.x | 5.x+ |
| **RAM** | 512 MB | 1 GB+ |
| **Storage** | 1 GB | 5 GB+ |
| **OS** | Any | Ubuntu 22.04 LTS |

---

## 🚀 Installation

### 📥 Quick Start (All Platforms)

```bash
# Clone the repository
git clone https://github.com/yourusername/telegram-youtube-bot.git
cd telegram-youtube-bot

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your values

# Start the bot
npm start