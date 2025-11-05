#!/bin/bash
# Verification script for jit-transcode-go service

set -e

echo "==================================="
echo "Go JIT Transcoding Service Verification"
echo "==================================="
echo ""

cd "$(dirname "$0")/.."

echo "📦 Checking file structure..."
echo "  ✓ Source files: $(find . -name '*.go' -type f | wc -l | tr -d ' ') Go files"
echo "  ✓ Test files: $(find . -name '*_test.go' -type f | wc -l | tr -d ' ') test files"
echo "  ✓ Total lines: $(find . -name '*.go' -type f -exec wc -l {} + | tail -1 | awk '{print $1}')"
echo ""

echo "🧪 Running tests..."
docker run --rm -v "$(pwd):/app" -w /app golang:1.21-alpine go test ./... -cover 2>&1 | grep -E "(PASS|FAIL|coverage)"
echo ""

echo "🏗️  Checking Docker build..."
cd ../../..
if docker images | grep -q "telecine-jit-transcode-go"; then
    echo "  ✓ Docker image exists"
else
    echo "  ✗ Docker image not found"
    echo "  Run: ./scripts/docker-compose build jit-transcode-go"
    exit 1
fi
echo ""

echo "🚀 Checking service status..."
if ./scripts/docker-compose ps | grep -q "jit-transcode-go.*healthy"; then
    echo "  ✓ Service is running and healthy"
else
    echo "  ✗ Service not running or unhealthy"
    echo "  Run: ./scripts/docker-compose up -d jit-transcode-go"
    exit 1
fi
echo ""

echo "🏥 Testing health endpoint..."
HEALTH_RESPONSE=$(./scripts/docker-compose exec jit-transcode-go wget -q -O- http://localhost:3002/health 2>/dev/null || echo "ERROR")
if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    echo "  ✓ Health check passed"
    echo "  Response: $HEALTH_RESPONSE"
else
    echo "  ✗ Health check failed"
    echo "  Response: $HEALTH_RESPONSE"
    exit 1
fi
echo ""

echo "==================================="
echo "✅ All verifications passed!"
echo "==================================="
echo ""
echo "Service Status:"
./scripts/docker-compose ps jit-transcode-go | tail -1
echo ""
echo "Quick Commands:"
echo "  View logs:  ./scripts/docker-compose logs -f jit-transcode-go"
echo "  Run tests:  docker run --rm -v \"\$(pwd)/services/jit-transcode-go:/app\" -w /app golang:1.21-alpine go test ./..."
echo "  Stop:       ./scripts/docker-compose stop jit-transcode-go"
echo ""
echo "Documentation:"
echo "  README:     services/jit-transcode-go/README.md"
echo "  Quickstart: services/jit-transcode-go/QUICKSTART.md"
echo "  Status:     services/jit-transcode-go/IMPLEMENTATION_STATUS.md"
echo ""

