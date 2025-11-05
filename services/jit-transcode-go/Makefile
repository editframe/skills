.PHONY: build run test clean install deps

# Build the server binary
build:
	@echo "Building jit-transcode server..."
	@go build -o bin/jit-transcode ./cmd/server

# Run the server in development mode
run:
	@echo "Starting server in development mode..."
	@NODE_ENV=development go run ./cmd/server

# Run tests
test:
	@echo "Running tests..."
	@go test -v ./...

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf bin/
	@rm -rf tmp/

# Install dependencies
deps:
	@echo "Installing dependencies..."
	@go mod download
	@go mod tidy

# Format code
fmt:
	@echo "Formatting code..."
	@go fmt ./...

# Run linter
lint:
	@echo "Running linter..."
	@golangci-lint run ./... || echo "Install golangci-lint: https://golangci-lint.run/usage/install/"

# Build Docker image
docker-build:
	@echo "Building Docker image..."
	@docker build -f Dockerfile.test -t jit-transcode-go:latest .

# Run in Docker
docker-run:
	@echo "Running in Docker..."
	@docker run -p 3002:3002 -e NODE_ENV=development jit-transcode-go:latest

# Development watch (requires entr)
watch:
	@echo "Watching for changes..."
	@find . -name "*.go" | entr -r make run

# Show help
help:
	@echo "Available targets:"
	@echo "  build        - Build the server binary"
	@echo "  run          - Run the server in development mode"
	@echo "  test         - Run tests"
	@echo "  clean        - Clean build artifacts"
	@echo "  deps         - Install dependencies"
	@echo "  fmt          - Format code"
	@echo "  lint         - Run linter"
	@echo "  docker-build - Build Docker image"
	@echo "  docker-run   - Run in Docker"
	@echo "  watch        - Watch for changes and rebuild"
	@echo "  help         - Show this help message"

