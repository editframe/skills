#!/usr/bin/env bash
# Build custom Electron with headless DMA-BUF patch.
# Runs ON the GCE build VM. Called by build-on-gce.sh.
#
# Usage: build-electron.sh <electron-version>
#   e.g.: build-electron.sh v40.1.0

set -euo pipefail

ELECTRON_VERSION="${1:?Usage: build-electron.sh <version, e.g. v40.1.0>}"
BUILD_ROOT="/mnt/build"
ELECTRON_ROOT="${BUILD_ROOT}/electron"
PATCH_DIR="${BUILD_ROOT}/patches"

export PATH="${BUILD_ROOT}/depot_tools:${PATH}"

echo "============================================"
echo "Building Electron ${ELECTRON_VERSION}"
echo "Build root: ${BUILD_ROOT}"
echo "============================================"

# ---- Install Chromium build deps (first time only) ----
if [ ! -f "${BUILD_ROOT}/.deps-installed" ]; then
  echo "==> Installing Chromium build dependencies..."
  sudo apt-get update
  sudo apt-get install -y \
    build-essential \
    clang \
    lld \
    python3 \
    python3-pip \
    git \
    curl \
    wget \
    pkg-config \
    libglib2.0-dev \
    libgbm-dev \
    libdrm-dev \
    libnss3-dev \
    libatk1.0-dev \
    libatk-bridge2.0-dev \
    libcups2-dev \
    libxcomposite-dev \
    libxdamage-dev \
    libxrandr-dev \
    libpango1.0-dev \
    libasound2-dev \
    libgtk-3-dev

  # Install Node.js (required by Electron's gclient hooks / yarn)
  if ! command -v node &>/dev/null; then
    echo "==> Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
  fi

  # Chromium's install-build-deps.sh handles the rest
  touch "${BUILD_ROOT}/.deps-installed"
fi

# ---- Initialize Electron checkout (first time only) ----
if [ ! -d "${ELECTRON_ROOT}" ]; then
  echo "==> Initializing Electron checkout..."
  mkdir -p "${ELECTRON_ROOT}"
  cd "${ELECTRON_ROOT}"

  # Create .gclient config
  cat > .gclient <<'GCLIENT'
solutions = [
  {
    "name": "src/electron",
    "url": "https://github.com/electron/electron.git@ELECTRON_VERSION_PLACEHOLDER",
    "deps_file": "DEPS",
    "managed": False,
    "custom_deps": {},
    "custom_vars": {},
  },
]
GCLIENT

  sed -i "s/ELECTRON_VERSION_PLACEHOLDER/${ELECTRON_VERSION}/" .gclient
else
  cd "${ELECTRON_ROOT}"
fi

# ---- Sync sources (first time: full download, subsequent: incremental) ----
echo "==> Running gclient sync (this may take a while on first run)..."
gclient sync --with_branch_heads --with_tags -j16

# ---- Install Chromium build deps via their script ----
if [ ! -f "${BUILD_ROOT}/.chromium-deps-installed" ]; then
  echo "==> Installing Chromium-specific build deps..."
  cd "${ELECTRON_ROOT}/src"
  # The Chromium build deps script
  if [ -f "build/install-build-deps.sh" ]; then
    sudo ./build/install-build-deps.sh --no-prompt --no-chromeos-fonts --no-arm --no-nacl
  fi
  touch "${BUILD_ROOT}/.chromium-deps-installed"
fi

cd "${ELECTRON_ROOT}/src"

# ---- Apply our patch ----
echo "==> Applying headless DMA-BUF patch..."
if [ -f "${PATCH_DIR}/apply-headless-dmabuf.sh" ]; then
  # Reset any previous patch to avoid double-applying
  git checkout -- ui/ozone/platform/headless/headless_surface_factory.cc \
                  ui/ozone/platform/headless/BUILD.gn 2>/dev/null || true
  bash "${PATCH_DIR}/apply-headless-dmabuf.sh"
else
  echo "ERROR: Patch script not found at ${PATCH_DIR}/apply-headless-dmabuf.sh" >&2
  exit 1
fi

# ---- Configure the build ----
echo "==> Configuring build..."
export CHROMIUM_BUILDTOOLS_PATH="${ELECTRON_ROOT}/src/buildtools"

# Use Release config for smaller artifact
GN_ARGS='import("//electron/build/args/release.gn")
is_component_build = false
symbol_level = 0
'

gn gen out/Release --args="${GN_ARGS}"

# ---- Build ----
echo "==> Building Electron (this will take 3-6 hours on first build)..."
echo "    Start time: $(date)"

ninja -C out/Release electron -j$(nproc)

echo "    End time: $(date)"

# ---- Package ----
echo "==> Packaging dist.zip..."
ninja -C out/Release electron:electron_dist_zip

DIST_ZIP="${ELECTRON_ROOT}/src/out/Release/dist.zip"
if [ -f "$DIST_ZIP" ]; then
  SIZE=$(du -h "$DIST_ZIP" | cut -f1)
  echo "==> Build successful! dist.zip: ${SIZE}"
else
  echo "ERROR: dist.zip not found at ${DIST_ZIP}" >&2
  exit 1
fi
