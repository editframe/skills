# Demonstration Assets

This directory contains assets used in documentation examples and demonstrations.

## Files

Place your demonstration assets here:

- `card-joker.mp3` - Audio sample for audio/waveform examples
- `bridge.jpg` - Image sample
- `dog.jpg` - Image sample
- `meme.jpg` - Image sample
- `bars-n-tone.mp4` - Video test pattern (generated in test setup)

## Syncing to GCS

To sync assets to the public bucket:

```bash
# Dry run to see what would change
./bin/sync-assets.sh --dry-run

# Actually sync the files
./bin/sync-assets.sh
```

The script will:

1. Upload new/changed files
2. Delete remote files not in this directory
3. Set appropriate cache headers (1 year)

Assets will be available at: `https://assets.editframe.com/`

## Cache Invalidation

If you need to update an existing file:

1. Change the filename (e.g., `bridge.jpg` → `bridge-v2.jpg`)
2. Update references in documentation
3. Run the sync script
4. Old file will be removed automatically

Or use the GCS console to manually delete the old object.
