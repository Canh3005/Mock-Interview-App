FROM ubuntu:22.04

# Avoid interactive prompts during apt install
ENV DEBIAN_FRONTEND=noninteractive

# ─── Install language runtimes ────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    # C / C++
    gcc \
    g++ \
    # Python 3
    python3 \
    python3-pip \
    # Java 17
    openjdk-17-jdk-headless \
    # Bash (already present, but explicit)
    bash \
    # Misc
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ─── Install Node.js 18 ───────────────────────────────────────────────────────
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# ─── Symlink python3 -> python ────────────────────────────────────────────────
RUN ln -sf /usr/bin/python3 /usr/bin/python

# ─── App setup ────────────────────────────────────────────────────────────────
WORKDIR /app

COPY package.json .
RUN npm install --production

COPY server.js .

EXPOSE 2358

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:2358/health || exit 1

CMD ["node", "server.js"]
