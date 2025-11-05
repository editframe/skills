#!/bin/bash

set -e

cd "$(dirname "$0")/../.."

echo "🚀 Running tests in container..."
exec ./scripts/docker-compose run --rm scheduler-go-test \
  /app/scripts/test-runner.sh "$@"
