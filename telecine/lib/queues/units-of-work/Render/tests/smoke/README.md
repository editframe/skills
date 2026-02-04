# Smoke Tests

Fast smoke tests that render minimal videos (100ms = 3 frames at 30fps) for quick feedback during development.

## Purpose

- **Fast TDD**: Get immediate feedback while developing (entire suite runs in ~30 seconds)
- **Basic validation**: Ensure each element can render without errors
- **Quick sanity check**: Verify core rendering functionality works
- **Pre-commit check**: Fast enough to run before every commit

## Structure

- `elements.smoke.test.ts` - One test per element (ef-timegroup, ef-image, ef-text, ef-video, ef-audio, ef-waveform)
- `core.smoke.test.ts` - Basic MP4 structure validation

Each test renders a 100ms video (3-6 frames at 30fps), which takes ~1-3 seconds per test.

## Usage

```bash
# Run all smoke tests
cd telecine && ./scripts/test lib/queues/units-of-work/Render/tests/smoke/

# Run specific smoke test file
cd telecine && ./scripts/test lib/queues/units-of-work/Render/tests/smoke/elements.smoke.test.ts

# Run smoke tests in watch mode during development
cd telecine && ./scripts/test lib/queues/units-of-work/Render/tests/smoke/ --watch
```

## When to Use

- **During development**: Use smoke tests for TDD and quick validation
- **Before commits**: Run smoke tests to catch obvious regressions
- **Before push**: Run full integration test suite (see parent directory)

## Integration Tests

For comprehensive testing with longer videos and more edge cases, see the full integration test suite in:
- `../core/` - Core functionality tests
- `../audio/` - Audio-related tests
- `../visual/` - Visual regression tests
- `../performance/` - Performance benchmarks

The integration tests use longer videos (1-2 seconds) and test more edge cases, but take several minutes to run.
