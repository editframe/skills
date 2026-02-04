# CI Integration for New Test Suite

## Current State

Both old (`full-render/`) and new (`tests/`) test suites should run in parallel during the verification period.

## GitHub Actions Configuration

### Option 1: Run both suites separately

```yaml
name: Test

on: [push, pull_request]

jobs:
  test-old-suite:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: cd telecine && npm install
      
      - name: Run old test suite
        run: cd telecine && npm test full-render/
        continue-on-error: false
      
      - name: Upload old suite artifacts
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: old-suite-artifacts
          path: telecine/lib/queues/units-of-work/Render/full-render/**/*.test.renders/

  test-new-suite:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: cd telecine && npm install
      
      - name: Run new test suite
        run: cd telecine && npm test tests/
        continue-on-error: false
      
      - name: Upload new suite artifacts
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: new-suite-artifacts
          path: telecine/lib/queues/units-of-work/Render/tests/.test-output/
```

### Option 2: Run both in single job

```yaml
name: Test

on: [push, pull_request]

jobs:
  test-both-suites:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: cd telecine && npm install
      
      - name: Run old test suite
        id: old-suite
        run: cd telecine && npm test full-render/
        continue-on-error: true
      
      - name: Run new test suite
        id: new-suite
        run: cd telecine && npm test tests/
        continue-on-error: true
      
      - name: Check results
        run: |
          if [ "${{ steps.old-suite.outcome }}" != "success" ]; then
            echo "Old suite failed"
            exit 1
          fi
          if [ "${{ steps.new-suite.outcome }}" != "success" ]; then
            echo "New suite failed"
            exit 1
          fi
          echo "Both suites passed!"
      
      - name: Upload artifacts on failure
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: test-artifacts
          path: |
            telecine/lib/queues/units-of-work/Render/full-render/**/*.test.renders/
            telecine/lib/queues/units-of-work/Render/tests/.test-output/
```

## After Verification Period

Once the new suite is proven stable (1-2 weeks), update CI to run only new suite:

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: cd telecine && npm install
      
      - name: Run core tests
        run: cd telecine && npm test tests/core/
      
      - name: Run visual regression tests
        run: cd telecine && npm test tests/visual/
      
      - name: Run audio tests
        run: cd telecine && npm test tests/audio/
      
      - name: Upload test artifacts on failure
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: test-artifacts
          path: telecine/lib/queues/units-of-work/Render/tests/.test-output/
```

## Test Filtering

### Run only core tests (fast)

```bash
npm test tests/core/
```

### Run only visual regression

```bash
npm test tests/visual/
```

### Run everything except experimental

```bash
npm test tests/ -- --exclude experimental
```

## Performance Expectations

- **Old suite:** ~4.4 minutes
- **New suite:** ~3 minutes (core + visual + audio)
- **Both suites:** ~7.5 minutes during transition

## Monitoring During Transition

Track these metrics:
1. Test execution time (old vs new)
2. Test failure rate (should be similar)
3. Bug detection (new suite should catch same bugs)
4. False positives (new suite should have fewer)

## Rollout Plan

### Week 1-2: Parallel Execution
- Run both suites in CI
- Compare results
- Fix any discrepancies in new suite

### Week 3: Primary New Suite
- New suite failures block merges
- Old suite failures are warnings only

### Week 4: Delete Old Suite
- Remove old suite from codebase
- Update all documentation
- Celebrate faster, clearer tests! 🎉

## Local Development

Developers should run new suite locally:

```bash
# Before committing
npm test tests/

# Quick check (core only)
npm test tests/core/

# Full check (with visual regression)
npm test tests/core/ tests/visual/
```

## Troubleshooting

### New suite fails but old suite passes

- Investigate new suite test
- May indicate different behavior (intentional or bug)
- Fix new suite test or rendering code

### Old suite fails but new suite passes

- Likely flaky test in old suite
- Document and ignore (will be deleted soon)

### Both suites fail

- Real bug in rendering code
- Fix the bug
- Both suites should pass

## Notes

- Do NOT delete old suite until new suite is proven stable
- Keep test artifacts for debugging
- Monitor CI execution time
- Update documentation as you transition
