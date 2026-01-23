# Generating Captions with WhisperX

Generate caption data for `ef-captions` using WhisperX.

## Check Installation

```bash
python -c "import whisperx; print('WhisperX installed')"
```

## Install WhisperX

```bash
# Create virtual environment (recommended)
python3 -m venv .venv
source .venv/bin/activate

# Install WhisperX
pip install git+https://github.com/m-bain/whisperx.git
```

## Generate Captions

Create `transcribe.py`:

```python
import whisperx
import json
import sys

def transcribe(input_file, output_file="captions.json"):
    device = "cpu"  # or "cuda" for GPU
    compute_type = "float32"  # "float16" for GPU
    
    # Load model and transcribe
    model = whisperx.load_model("large-v2", device=device, compute_type=compute_type)
    audio = whisperx.load_audio(input_file)
    result = model.transcribe(audio, batch_size=16, language="en")
    
    # Align for word-level timestamps
    model_a, metadata = whisperx.load_align_model(language_code="en", device=device)
    result = whisperx.align(result["segments"], model_a, metadata, audio, device)
    
    # Convert to ef-captions format
    captions = {
        "segments": [],
        "word_segments": []
    }
    
    for segment in result["segments"]:
        captions["segments"].append({
            "start": segment["start"],
            "end": segment["end"],
            "text": segment["text"].strip()
        })
        
        if "words" in segment:
            for word in segment["words"]:
                if "start" in word and "end" in word:
                    captions["word_segments"].append({
                        "start": word["start"],
                        "end": word["end"],
                        "text": word["word"]
                    })
    
    with open(output_file, "w") as f:
        json.dump(captions, f, indent=2)
    
    print(f"Captions saved to {output_file}")

if __name__ == "__main__":
    transcribe(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "captions.json")
```

Run:

```bash
python transcribe.py video.mp4 captions.json
```

## Output Format

The script outputs JSON compatible with `ef-captions`:

```json
{
  "segments": [
    { "start": 0, "end": 2.5, "text": "Hello world" }
  ],
  "word_segments": [
    { "start": 0, "end": 0.8, "text": "Hello" },
    { "start": 0.9, "end": 2.5, "text": "world" }
  ]
}
```

## Use in Composition

```html
<script type="application/json" id="my-captions">
  <!-- paste captions.json content here -->
</script>

<ef-captions captions-script="my-captions">
  <ef-captions-before-active-word class="text-white/60"></ef-captions-before-active-word>
  <ef-captions-active-word class="text-yellow-300 font-bold"></ef-captions-active-word>
  <ef-captions-after-active-word class="text-white/40"></ef-captions-after-active-word>
</ef-captions>
```

Or load from file:

```html
<ef-captions captions-src="/path/to/captions.json">...</ef-captions>
```
