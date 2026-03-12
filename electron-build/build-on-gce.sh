#!/usr/bin/env bash
# Build a custom Electron on a GCE VM with our headless DMA-BUF patch.
#
# This script:
#   1. Creates a GCE VM (or reuses one) with a large persistent disk
#   2. Copies the patch scripts to the VM
#   3. SSHs in and runs the build
#   4. Uploads the dist.zip to GCS
#   5. Optionally deletes the VM (keeps disk for incremental rebuilds)
#
# Usage:
#   telecine/electron-build/build-on-gce.sh [--create-vm] [--delete-vm] [--ssh-only]
#
# Prerequisites:
#   - gcloud CLI authenticated with editframe project
#   - GCS bucket gs://editframe-electron-builds exists

set -euo pipefail

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

# ---- Configuration ----
PROJECT=editframe
ZONE=us-central1-a
VM_NAME=electron-builder
MACHINE_TYPE=n2-standard-32   # 32 vCPU, 128 GB RAM
DISK_SIZE=300                  # GB
DISK_NAME=electron-builder-disk
IMAGE_FAMILY=ubuntu-2204-lts
IMAGE_PROJECT=ubuntu-os-cloud

ELECTRON_VERSION=v40.1.0
GCS_BUCKET=gs://editframe-electron-builds
ARTIFACT_NAME="editframe-${ELECTRON_VERSION}-dmabuf.zip"

CREATE_VM=0
DELETE_VM=0
SSH_ONLY=0
for arg in "$@"; do
  case $arg in
    --create-vm) CREATE_VM=1 ;;
    --delete-vm) DELETE_VM=1 ;;
    --ssh-only)  SSH_ONLY=1 ;;
  esac
done

# ---- Helper: SSH to the VM ----
gssh() {
  gcloud compute ssh "$VM_NAME" \
    --project="$PROJECT" \
    --zone="$ZONE" \
    --command="$1"
}

# ---- Step 1: Create VM if requested ----
if [ "$CREATE_VM" -eq 1 ]; then
  echo "==> Creating GCE VM ${VM_NAME}..."

  # Create persistent disk if it doesn't exist
  if ! gcloud compute disks describe "$DISK_NAME" --project="$PROJECT" --zone="$ZONE" &>/dev/null; then
    echo "    Creating persistent disk ${DISK_NAME} (${DISK_SIZE}GB SSD)..."
    gcloud compute disks create "$DISK_NAME" \
      --project="$PROJECT" \
      --zone="$ZONE" \
      --size="${DISK_SIZE}GB" \
      --type=pd-ssd
  fi

  # Create VM with the persistent disk
  gcloud compute instances create "$VM_NAME" \
    --project="$PROJECT" \
    --zone="$ZONE" \
    --machine-type="$MACHINE_TYPE" \
    --image-family="$IMAGE_FAMILY" \
    --image-project="$IMAGE_PROJECT" \
    --boot-disk-size=50GB \
    --boot-disk-type=pd-ssd \
    --disk="name=${DISK_NAME},device-name=build-disk,mode=rw" \
    --scopes=storage-rw,compute-ro \
    --metadata=startup-script='#!/bin/bash
      # Mount the build disk
      if ! mountpoint -q /mnt/build; then
        # Format if needed (only first time)
        if ! blkid /dev/disk/by-id/google-build-disk; then
          mkfs.ext4 -F /dev/disk/by-id/google-build-disk
        fi
        mkdir -p /mnt/build
        mount /dev/disk/by-id/google-build-disk /mnt/build
        chmod 777 /mnt/build
      fi
    '

  echo "    Waiting for VM to be ready..."
  sleep 30

  echo "    Installing build dependencies..."
  gssh "sudo apt-get update && sudo apt-get install -y git python3 python3-pip curl lsb-release software-properties-common && \
    # Install depot_tools
    if [ ! -d /mnt/build/depot_tools ]; then
      git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git /mnt/build/depot_tools
    fi && \
    echo 'export PATH=/mnt/build/depot_tools:\$PATH' >> ~/.bashrc"

  echo "==> VM created. Use --ssh-only to connect later."
fi

# ---- Step 2: SSH only ----
if [ "$SSH_ONLY" -eq 1 ]; then
  gcloud compute ssh "$VM_NAME" --project="$PROJECT" --zone="$ZONE"
  exit 0
fi

# ---- Step 3: Copy patch to VM ----
echo "==> Copying patch scripts to VM..."
gcloud compute scp --recurse \
  "${SCRIPT_DIR}/patches/" \
  "${SCRIPT_DIR}/build-electron.sh" \
  "${VM_NAME}:/mnt/build/" \
  --project="$PROJECT" \
  --zone="$ZONE"

# ---- Step 4: Run the build (background, survives SSH disconnect) ----
echo "==> Starting Electron build on VM in background..."
gssh "chmod +x /mnt/build/build-electron.sh && \
  nohup bash -c 'export PATH=/mnt/build/depot_tools:\$PATH && \
  /mnt/build/build-electron.sh ${ELECTRON_VERSION} > /mnt/build/build.log 2>&1 && \
  echo BUILD_SUCCESS >> /mnt/build/build.log && \
  gcloud storage cp /mnt/build/electron/src/out/Release/dist.zip ${GCS_BUCKET}/${ARTIFACT_NAME} >> /mnt/build/build.log 2>&1 && \
  echo UPLOAD_SUCCESS >> /mnt/build/build.log || \
  echo BUILD_FAILED >> /mnt/build/build.log' &"

echo ""
echo "==> Build started in background on ${VM_NAME}."
echo ""
echo "    Monitor progress:"
echo "      gcloud compute ssh ${VM_NAME} --project=${PROJECT} --zone=${ZONE} --command='tail -f /mnt/build/build.log'"
echo ""
echo "    Check completion:"
echo "      gcloud compute ssh ${VM_NAME} --project=${PROJECT} --zone=${ZONE} --command='tail -5 /mnt/build/build.log'"
echo ""
echo "    SSH into VM:"
echo "      gcloud compute ssh ${VM_NAME} --project=${PROJECT} --zone=${ZONE}"
echo ""
echo "    Artifact (when done): ${GCS_BUCKET}/${ARTIFACT_NAME}"
echo ""
echo "    Delete VM when done (keeps disk for rebuilds):"
echo "      gcloud compute instances delete ${VM_NAME} --project=${PROJECT} --zone=${ZONE} --keep-disks=data --quiet"
