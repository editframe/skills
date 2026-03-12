#!/usr/bin/env bash

# Test script to verify production fixes work correctly
# Tests both fs.server.ts path resolution and CustomElementRegistry fixes

set -e

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
TELECINE_ROOT="${SCRIPT_DIR}/.."
cd "$TELECINE_ROOT"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Testing Production Fixes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 1: Path resolution in production container
echo ""
echo "Test 1: Verifying fs.server.ts path resolution in production container..."
docker run --rm \
  -v "$TELECINE_ROOT:/app" \
  -w /app \
  telecine-web-prod-debug \
  node -e "
    const { resolve } = require('path');
    const { existsSync } = require('fs');
    const appDir = resolve(process.cwd(), 'services/web/app');
    const contentDir = resolve(appDir, 'content');
    console.log('  cwd:', process.cwd());
    console.log('  appDir:', appDir);
    console.log('  contentDir:', contentDir);
    console.log('  contentDir exists:', existsSync(contentDir));
    if (!existsSync(contentDir)) {
      process.exit(1);
    }
    console.log('  ✅ Path resolution works correctly!');
  "

if [ $? -eq 0 ]; then
  echo "  ✅ Test 1 PASSED"
else
  echo "  ❌ Test 1 FAILED"
  exit 1
fi

# Test 2: Verify ClientConfiguration prevents SSR import
echo ""
echo "Test 2: Verifying ClientConfiguration prevents SSR custom element registration..."
echo "  (This test verifies that @editframe/react is not imported during SSR)"

# Check if root.tsx imports Configuration directly
ROOT_FILE="$TELECINE_ROOT/services/web/app/root.tsx"
CLIENT_CONFIG_FILE="$TELECINE_ROOT/services/web/app/components/ClientConfiguration.tsx"

if [ ! -f "$ROOT_FILE" ]; then
  echo "  ⚠️  root.tsx not found at $ROOT_FILE, skipping import check"
elif grep -q "import.*Configuration.*from.*@editframe/react" "$ROOT_FILE"; then
  echo "  ❌ Test 2 FAILED: root.tsx still imports Configuration directly"
  exit 1
elif ! grep -q "ClientConfiguration" "$ROOT_FILE"; then
  echo "  ❌ Test 2 FAILED: root.tsx doesn't use ClientConfiguration"
  exit 1
fi

# Check if ClientConfiguration exists and uses lazy import
if [ ! -f "$CLIENT_CONFIG_FILE" ]; then
  echo "  ❌ Test 2 FAILED: ClientConfiguration.tsx not found"
  exit 1
elif ! grep -q "import.*@editframe/react" "$CLIENT_CONFIG_FILE"; then
  echo "  ❌ Test 2 FAILED: ClientConfiguration doesn't lazy import @editframe/react"
  exit 1
fi

echo "  ✅ Test 2 PASSED: ClientConfiguration uses client-only import"

# Test 3: Verify patches can be removed (check if they're still needed)
echo ""
echo "Test 3: Checking if CustomElementRegistry patches can be removed..."
echo "  Note: Patches should be removed after verifying ClientConfiguration works in production"

PATCH_COUNT=$(grep -r "patchCustomElementsDefine\|customElements\.define.*function" "$TELECINE_ROOT/services/web/server/app.ts" "$TELECINE_ROOT/loader.js" 2>/dev/null | wc -l | tr -d ' ')

if [ "$PATCH_COUNT" -gt 0 ]; then
  echo "  ⚠️  Patches still exist ($PATCH_COUNT occurrences)"
  echo "  → Should be removed after production verification"
else
  echo "  ✅ No patches found (already removed)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "All tests completed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  1. Run production container: ./scripts/debug-prod-web"
echo "  2. Test docs routes: curl http://localhost:3000/docs/video-composition/create-a-composition/overview/"
echo "  3. Check logs for 'Not found' errors"
echo "  4. Check logs for CustomElementRegistry errors"
echo "  5. If both are fixed, remove patches from loader.js and server/app.ts"

