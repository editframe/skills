# Blocking Issues for New Test Suite

## Media Element Initialization Timeout

**Status:** BLOCKING - Affects all media element tests (`ef-video`, `ef-audio`, `ef-waveform`)

**Error:**
```
FRAMEGEN Initialization timeout. Failed to receive 'initialized' event within 3000ms.
```

**Root Cause:**
```
TypeError: Failed to execute 'text' on 'Response': body stream already read
```

**Affected Tests:**
- `tests/core/elements/ef-video.test.ts` - All 12 tests fail
- `tests/core/elements/ef-audio.test.ts` - All 9 tests fail  
- `tests/core/elements/ef-waveform.test.ts` - Likely all tests fail (not yet run)

**Analysis:**
The error occurs during the renderer initialization phase when media elements (`ef-video`, `ef-audio`) attempt to fetch asset data from the web server. The Response body is being consumed twice:

1. First consumption: Unknown location in media element code
2. Second consumption: When trying to call `.text()` on the already-consumed Response

This suggests either:
1. A race condition where multiple code paths try to read the same response
2. A missing `.clone()` call on the Response before the first read
3. A cached Response object being reused incorrectly

**Investigation Steps:**
1. Search the elements codebase for Response handling in media element asset loading
2. Look for duplicate `.text()`, `.json()`, or `.arrayBuffer()` calls on the same Response
3. Check if Response objects are being cached and reused without cloning
4. Review the asset fetching code path in `ef-video`, `ef-audio`, and `ef-waveform` elements

**Workaround:**
None currently available. The old test suite may use a different code path that avoids this issue, or the issue may be specific to how the new simplified `render()` utility initializes the renderer.

**Impact:**
- Cannot test media elements (`ef-video`, `ef-audio`, `ef-waveform`) with the new test suite
- Approximately 30% of planned test coverage is blocked
- All other element tests (`ef-timegroup`, `ef-image`, `ef-text`, CSS animations) work correctly

**Next Steps:**
1. Fix the Response body consumption issue in the elements framework
2. Re-run the blocked tests to verify they pass
3. Continue with remaining test suite implementation
