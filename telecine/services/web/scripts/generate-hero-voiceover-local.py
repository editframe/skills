#!/usr/bin/env python3
"""Generate per-scene hero voiceover WAVs + MP3s using local Qwen3-TTS.

Each segment gets its own stage direction to shape delivery for that scene's
psychology, then produces an individual WAV and MP3 file.
"""
import json
import os
import subprocess
import time

import numpy as np
import soundfile as sf
import torch
from huggingface_hub import snapshot_download
from qwen_tts import Qwen3TTSModel

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "audio", "hero")
os.makedirs(OUT, exist_ok=True)

SPEAKER = "ryan"

SEGMENTS = [
    {
        "key": "01-title",
        "text": "Video shouldn't be this hard to automate.",
        "instruct": (
            "Speak clearly and directly. Confident, warm tone. "
            "Normal conversational pace, not slow."
        ),
    },
    {
        "key": "02-author",
        "text": (
            "Video is just markup. Write HTML, style it with CSS, "
            "then reach for React or JavaScript when you need to."
        ),
        "instruct": (
            "Start matter-of-fact, almost casual, like explaining something simple. "
            "Build slight energy on 'React or JavaScript' as the unlock moment. "
            "Warm and inviting, not salesy."
        ),
    },
    {
        "key": "03-layers",
        "text": (
            "Stack layers like you'd stack elements. "
            "Video, text, shapes, 3D, each one composable."
        ),
        "instruct": (
            "Rhythmic and visual. Each media type should land like placing a block. "
            "Pause slightly between items in the list. Confident, building momentum."
        ),
    },
    {
        "key": "04-timeline",
        "text": (
            "Need an editor? Snap together GUI primitives. "
            "Timeline, waveforms, captions, "
            "into any editing experience you want."
        ),
        "instruct": (
            "Start with a direct, almost rhetorical question. Then shift to assembling "
            "something with your hands. List items briskly, each one clicking into place. "
            "End with expansive possibility."
        ),
    },
    {
        "key": "05-editor",
        "text": (
            "A full NLE. A simple trim tool in a form. "
            "It's your UI, these are just the building blocks."
        ),
        "instruct": (
            "Two contrasting examples delivered with equal confidence. "
            "The first short and punchy, the second casual. "
            "End reassuringly, like handing someone the keys."
        ),
    },
    {
        "key": "06-template",
        "text": "Feed in data, and one template becomes ten thousand unique videos.",
        "instruct": (
            "Start small and practical. Let 'ten thousand' land with quiet awe, "
            "not hype. The scale should feel effortless, not breathless."
        ),
    },
    {
        "key": "07-stream",
        "text": (
            "Preview is instant. Frames stream just-in-time, "
            "so you're never waiting on a render to see your work."
        ),
        "instruct": (
            "Crisp and fast on 'instant'. Slow slightly for 'just-in-time' to "
            "let the concept register. The final clause is relief, like a weight "
            "being lifted."
        ),
    },
    {
        "key": "08-render",
        "text": (
            "When it's ready, render to the cloud, the browser, "
            "or the command line. Same composition, every target."
        ),
        "instruct": (
            "Calm authority, wrapping up. List the three targets evenly. "
            "The closing line should feel like a full stop, definitive "
            "and satisfying."
        ),
    },
]


def main():
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    dtype = torch.float32
    print(f"Device: {device}, dtype: {dtype}")

    print("Loading Qwen3-TTS model...")
    model_path = snapshot_download("Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice")
    model = Qwen3TTSModel.from_pretrained(
        model_path, device_map=device, dtype=dtype,
    )
    print("Model loaded.\n")

    durations = {}

    for seg in SEGMENTS:
        key = seg["key"]
        text = seg["text"]
        instruct = seg["instruct"]
        wav_path = os.path.join(OUT, f"{key}.wav")
        mp3_path = os.path.join(OUT, f"{key}.mp3")

        print(f"[{key}] {text[:60]}...")
        t0 = time.time()

        wavs, sr = model.generate_custom_voice(
            text=text,
            language="English",
            speaker=SPEAKER,
            instruct=instruct,
            non_streaming_mode=True,
            max_new_tokens=4096,
        )
        elapsed = time.time() - t0

        audio = wavs[0]
        if isinstance(audio, torch.Tensor):
            audio = audio.cpu().numpy()

        duration = len(audio) / sr
        sf.write(wav_path, audio, sr)

        subprocess.run(
            ["ffmpeg", "-y", "-i", wav_path, "-codec:a", "libmp3lame", "-b:a", "128k", mp3_path],
            capture_output=True,
        )

        print(f"[{key}] {duration:.2f}s ({elapsed:.1f}s to generate)")
        durations[key] = round(duration, 3)

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
