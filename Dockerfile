# ── Base image ─────────────────────────────────────────────────────────────────
FROM node:20-slim

# Install ffmpeg, python3, curl, pip
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp via pip (most reliable method)
RUN pip3 install -U yt-dlp --break-system-packages

# Verify installations
RUN yt-dlp --version && ffmpeg -version | head -1

# Working directory
WORKDIR /app

# Install Node dependencies
COPY package*.json ./
RUN npm install --production

# Copy source code
COPY . .

# Create downloads folder
RUN mkdir -p downloads

# Start bot
CMD ["node", "index.js"]