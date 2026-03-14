# ── Base ───────────────────────────────────────────────────────────────────────
FROM node:20-slim

# ── Install system dependencies ────────────────────────────────────────────────
# ffmpeg        — audio/video processing
# python3 + pip — required to install yt-dlp
# curl          — needed by Railway health checks
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    python-is-python3 \
    curl \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# ── Install yt-dlp ─────────────────────────────────────────────────────────────
RUN pip3 install --break-system-packages --upgrade yt-dlp

# ── Set working directory ──────────────────────────────────────────────────────
WORKDIR /app

# ── Install Node dependencies ──────────────────────────────────────────────────
COPY package*.json ./
RUN npm ci --omit=dev

# ── Copy source code ───────────────────────────────────────────────────────────
COPY . .

# ── Create required directories ────────────────────────────────────────────────
RUN mkdir -p downloads data

# ── Start bot ─────────────────────────────────────────────────────────────────
CMD ["node", "index.js"]