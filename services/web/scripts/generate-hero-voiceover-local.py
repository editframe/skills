#!/usr/bin/env python3
"""Generate per-scene hero voiceover WAVs + MP3s using local Qwen3-TTS Base model.

Generates the entire script as a single TTS pass for consistent voice,
then uses whisper word-level timestamps to find segment boundaries and splits
at zero crossings for click-free cuts.
"""
import json
import os
import subprocess
import tempfile
import time

import numpy as np
import soundfile as sf
import torch
import whisper
from huggingface_hub import snapshot_download
from qwen_tts import Qwen3TTSModel

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "audio", "hero")
os.makedirs(OUT, exist_ok=True)

INSTRUCT = (
    "A confident male narrator in his 30s with a warm, clear voice. "
    "Direct delivery, normal conversational pace."
)

SEGMENTS = [
    {
        "key": "00-preamble",
        "text": "Here is the introduction.",
        "last_word": "introduction",
        "discard": True,
    },
    {
        "key": "01-title",
        "text": "Video is a web page that moves.",
        "last_word": "moves",
    },
    {
        "key": "02-author",
        "text": (
            "It starts with HTML and CSS. "
            "When you need more, it's just React."
        ),
        "last_word": "React",
    },
    {
        "key": "03-layers",
        "text": (
            "Stack layers the way you stack divs. "
            "Video, text, shapes, 3D, mix everything."
        ),
        "last_word": "everything",
    },
    {
        "key": "04-timeline",
        "text": (
            "Need an editor? Snap together GUI primitives. "
            "Timeline, waveforms, captions, "
            "into any editing experience you want."
        ),
        "last_word": "want",
    },
    {
        "key": "05-editor",
        "text": (
            "A full NLE. A simple trim tool in a form. "
            "It's your UI. These are just the building blocks."
        ),
        "last_word": "blocks",
    },
    {
        "key": "06-template",
        "text": "Feed in data, and one template becomes ten thousand unique videos.",
        "last_word": "videos",
    },
    {
        "key": "07-stream",
        "text": "Preview is instant. Change the code, see the frame.",
        "last_word": "frame",
    },
    {
        "key": "08-render",
        "text": (
            "When it's ready, render to the cloud, the browser, "
            "or the command line. Same composition, every target."
        ),
        "last_word": "target",
    },
]

PAUSE_SEPARATOR = " ... "


def find_zero_crossing(audio, center_sample, search_radius=400):
    """Find nearest zero crossing to center_sample."""
    start = max(0, center_sample - search_radius)
    end = min(len(audio), center_sample + search_radius)
    region = audio[start:end]

    crossings = np.where(np.diff(np.signbit(region)))[0]
    if len(crossings) == 0:
        return center_sample

    relative_center = center_sample - start
    nearest = crossings[np.argmin(np.abs(crossings - relative_center))]
    return start + int(nearest)


def get_word_timestamps(wav_path):
    """Run whisper on audio and return flat list of (word, start_sec, end_sec)."""
    model = whisper.load_model("small")
    result = model.transcribe(wav_path, language="en", word_timestamps=True)
    words = []
    for seg in result["segments"]:
        for w in seg.get("words", []):
            words.append((w["word"].strip(), w["start"], w["end"]))
    return words


def find_split_points(words, segments, sr, audio_len):
    """Use whisper words to find where each segment ends, return sample positions."""
    splits = []
    word_idx = 0

    for seg_i in range(len(segments) - 1):
        last_word_stem = segments[seg_i]["last_word"].lower().rstrip(".,;:!?")

        best_idx = None
        next_seg_first = None
        for wi in range(word_idx, len(words)):
            w_text = words[wi][0].lower().rstrip(".,;:!?'\"")
            if w_text == last_word_stem or last_word_stem in w_text:
                best_idx = wi

                first_word = segments[seg_i + 1]["text"].split()[0].lower().rstrip(".,;:!?")
                for wj in range(wi + 1, min(wi + 8, len(words))):
                    wj_text = words[wj][0].lower().rstrip(".,;:!?'\"")
                    if wj_text == first_word or first_word in wj_text:
                        next_seg_first = wj
                        break

                if next_seg_first is not None:
                    break

        if best_idx is None:
            print(f"  WARNING: could not find '{last_word_stem}' for {segments[seg_i]['key']}")
            splits.append(int(audio_len * (seg_i + 1) / len(segments)))
            continue

        end_sec = words[best_idx][1]
        if next_seg_first is not None:
            start_next_sec = words[next_seg_first][1]
            split_sec = (end_sec + start_next_sec) / 2
            word_idx = next_seg_first
        else:
            split_sec = end_sec + 0.3
            word_idx = best_idx + 1

        split_sample = int(split_sec * sr)
        print(f"  {segments[seg_i]['key']} ends at ~{end_sec:.2f}s, split at {split_sec:.2f}s")
        splits.append(split_sample)

    return splits


def main():
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    dtype = torch.float32
    print(f"Device: {device}, dtype: {dtype}")

    print("Loading Qwen3-TTS Base model...")
    model_path = snapshot_download("Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign")
    model = Qwen3TTSModel.from_pretrained(
        model_path, device_map=device, dtype=dtype,
    )
    print("Model loaded.\n")

    full_text = PAUSE_SEPARATOR.join(seg["text"] for seg in SEGMENTS)
    print(f"Full script ({len(full_text)} chars):")
    print(f"  {full_text[:120]}...\n")

    print("Generating full voiceover as single pass...")
    t0 = time.time()
    wavs, sr = model.generate_voice_design(
        text=full_text,
        language="English",
        instruct=INSTRUCT,
        non_streaming_mode=True,
        max_new_tokens=8192,
    )
    elapsed = time.time() - t0

    full_audio = wavs[0]
    if isinstance(full_audio, torch.Tensor):
        full_audio = full_audio.cpu().numpy()

    total_duration = len(full_audio) / sr
    print(f"Full audio: {total_duration:.2f}s ({elapsed:.1f}s to generate)\n")

    full_wav_path = os.path.join(OUT, "voiceover.wav")
    full_mp3_path = os.path.join(OUT, "voiceover.mp3")
    sf.write(full_wav_path, full_audio, sr)
    subprocess.run(
        ["ffmpeg", "-y", "-i", full_wav_path, "-codec:a", "libmp3lame", "-b:a", "128k", full_mp3_path],
        capture_output=True,
    )

    print("Running whisper for word-level timestamps...")
    words = get_word_timestamps(full_wav_path)
    print(f"  {len(words)} words detected")
    for w, s, e in words:
        print(f"    {s:6.2f}-{e:6.2f}  {w}")

    print("\nFinding segment boundaries from word timestamps...")
    split_samples = find_split_points(words, SEGMENTS, sr, len(full_audio))

    split_samples_zc = [find_zero_crossing(full_audio, s) for s in split_samples]

    boundaries = [0] + split_samples_zc + [len(full_audio)]
    durations = {}

    print(f"\nSplitting into {len(SEGMENTS)} segments:")
    for i, seg in enumerate(SEGMENTS):
        key = seg["key"]
        start = boundaries[i]
        end = boundaries[i + 1]
        segment_audio = full_audio[start:end]
        duration = len(segment_audio) / sr
        start_sec = start / sr
        end_sec = end / sr

        if seg.get("discard"):
            print(f"  {key}: {duration:.2f}s  ({start_sec:.2f}s - {end_sec:.2f}s)  [DISCARDED]")
            continue

        wav_path = os.path.join(OUT, f"{key}.wav")
        mp3_path = os.path.join(OUT, f"{key}.mp3")
        sf.write(wav_path, segment_audio, sr)
        subprocess.run(
            ["ffmpeg", "-y", "-i", wav_path, "-codec:a", "libmp3lame", "-b:a", "128k", mp3_path],
            capture_output=True,
        )

        durations[key] = round(duration, 3)
        print(f"  {key}: {duration:.2f}s  ({start_sec:.2f}s - {end_sec:.2f}s)")

    timing_path = os.path.join(OUT, "timing.json")
    with open(timing_path, "w") as f:
        json.dump(durations, f, indent=2)
    print(f"\nTiming written to {timing_path}")

    total = sum(durations.values())
    print(f"\n=== Summary ===")
    for k, v in durations.items():
        print(f"  {k}: {v:.2f}s")
    print(f"  TOTAL: {total:.2f}s")


if __name__ == "__main__":
    main()
