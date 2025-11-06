FROM mcr.microsoft.com/playwright:v1.53.0-noble

# Install Node.js 22 and other dependencies
RUN apt-get -y update && \
  apt-get install -y --fix-missing \
  curl \
  ca-certificates \
  xvfb \
  python3-pip \
  ffmpeg \
  zsh \
  cmake \
  git \
  pkg-config \
  libcurl4-openssl-dev \
  libfdk-aac2 \
  libasound2t64 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdrm2 \
  libgbm1 \
  libgtk-3-0 \
  libnss3 \
  libxss1 \
  imagemagick \
  gcc \
  g++ \
  build-essential \
  jq \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g hasura-cli@2.36.1 tsx

# Install Docker CLI and Docker Compose (needed to run docker commands that interact with host Docker daemon)
# Detect architecture at build time and install appropriate static binaries
# Note: During build, there's no Docker daemon available, so we only verify binaries exist
RUN ARCH=$(dpkg --print-architecture) && \
  if [ "$ARCH" = "arm64" ]; then \
    DOCKER_ARCH="aarch64"; \
    COMPOSE_ARCH="aarch64"; \
  else \
    DOCKER_ARCH="x86_64"; \
    COMPOSE_ARCH="x86_64"; \
  fi && \
  curl -fsSL "https://download.docker.com/linux/static/stable/${DOCKER_ARCH}/docker-24.0.0.tgz" | tar -xzC /tmp && \
  mv /tmp/docker/docker /usr/local/bin/ && \
  rm -rf /tmp/docker && \
  curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-${COMPOSE_ARCH}" -o /usr/local/bin/docker-compose && \
  chmod +x /usr/local/bin/docker-compose && \
  docker --version && \
  docker-compose --version

RUN pip3 install \
  torch \
  torchvision \
  torchaudio \
  --index-url https://download.pytorch.org/whl/cpu \
  --break-system-packages

RUN pip3 install \
  git+https://github.com/m-bain/whisperx.git \
  --break-system-packages || true

# Install oh-my-zsh
RUN wget https://github.com/robbyrussell/oh-my-zsh/raw/master/tools/install.sh -O - | zsh || true

# Create vscode user and add to docker group (for socket access)
RUN useradd -m -s /bin/zsh vscode && \
  chown -R vscode:vscode /home/vscode && \
  groupadd -f docker && \
  usermod -aG docker vscode

WORKDIR /workspace

USER vscode

SHELL ["/bin/zsh", "-c"]



