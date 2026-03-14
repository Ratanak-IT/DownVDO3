# ── Base ───────────────────────────────────────────────────────────────────────
FROM node:20-slim

# ── Install system dependencies ────────────────────────────────────────────────
# ffmpeg            — audio/video processing
# python3 + pip     — yt-dlp runtime
# python-is-python3 — creates `python` symlink needed by some npm postinstall scripts
# curl              — Railway health checks
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    python-is-python3 \
    curl \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# ── Install yt-dlp via pip (always latest, works on Linux/Railway) ─────────────
RUN pip3 install --break-system-packages --upgrade yt-dlp

# ── Set working directory ──────────────────────────────────────────────────────
WORKDIR /app

# ── Install Node dependencies ──────────────────────────────────────────────────
# --ignore-scripts skips ALL postinstall hooks (yt-dlp-exec, package.json postinstall, etc.)
# yt-dlp is already installed above via pip so we don't need the npm bundled binary
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# ── Copy source code ───────────────────────────────────────────────────────────
COPY . .

# ── Create required directories ────────────────────────────────────────────────
RUN mkdir -p downloads data

# ── Start bot ──────────────────────────────────────────────────────────────────
CMD ["node", "index.js"]