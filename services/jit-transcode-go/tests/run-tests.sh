#!/bin/bash
set -e

echo "═══════════════════════════════════════════════════════════════"
echo "  JIT Transcoding Service Parity Validation"
echo "═══════════════════════════════════════════════════════════════"
echo ""

cd "$(dirname "$0")"

echo "📦 Installing dependencies..."
npm install --silent

echo ""
echo "🔍 Checking service health..."
echo ""

echo "TypeScript service:"
curl -s http://jit-transcoding:3001/health | jq . || echo "  ⚠️  TypeScript service not responding"

echo ""
echo "Go service:"
curl -s http://jit-transcode-go:3002/health | jq . || echo "  ⚠️  Go service not responding"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Running Parity Tests"
echo "═══════════════════════════════════════════════════════════════"
echo ""

npx vitest run parity-validation.test.ts

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Running JIT Architecture Tests"
echo "═══════════════════════════════════════════════════════════════"
echo ""

npx vitest run jit-architecture-validation.test.ts

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  ✅ All Parity Tests Complete"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Output files saved to: ./output/"
echo "View with: ls -lh ./output/"

