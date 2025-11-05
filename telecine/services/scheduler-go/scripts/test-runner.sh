#!/bin/sh

# Scheduler Go Test Runner (runs inside container)
# Handles all test execution logic

set -e

echo "🐳 Scheduler Go Test Runner..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Parse command line arguments
RUN_MEMORY_TESTS=false
RUN_INTEGRATION_TESTS=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --memory)
            RUN_MEMORY_TESTS=true
            shift
            ;;
        --integration)
            RUN_INTEGRATION_TESTS=true
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --run|-run)
            TEST_RUN_PATTERN="$2"
            shift 2
            ;;
        --pkg|--package)
            TEST_PACKAGE="$2"
            shift 2
            ;;
        --timeout|-timeout)
            TEST_TIMEOUT="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: test-runner.sh [OPTIONS]"
            echo "Options:"
            echo "  --memory              Run memory leak tests"
            echo "  --integration         Run integration tests"
            echo "  --verbose, -v         Verbose output"
            echo "  --run PATTERN         Run only tests matching PATTERN"
            echo "  --pkg PACKAGE         Run tests only in PACKAGE (e.g., ./internal/connection)"
            echo "  --timeout DURATION    Set test timeout (e.g., 30s, 5m)"
            echo "  --help, -h            Show this help"
            echo ""
            echo "Examples:"
            echo "  test-runner.sh --run TestWorkerConnection"
            echo "  test-runner.sh --pkg ./internal/connection --run TestTimeout"
            echo "  test-runner.sh --integration --timeout 2m"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Set verbose flag for go test
VERBOSE_FLAG=""
if [ "$VERBOSE" = true ]; then
    VERBOSE_FLAG="-v"
fi

# We're already in the scheduler-go directory (/app)
cd /app

# Test dependencies
print_info "Testing service dependencies..."
if ! redis-cli -h valkey ping > /dev/null 2>&1; then
    print_error "Redis is not ready. Ensure valkey container is running."
    exit 1
fi
if ! pg_isready -h ${POSTGRES_HOST:-postgres} -U ${POSTGRES_USER:-postgres} > /dev/null 2>&1; then
    print_error "PostgreSQL is not ready. Ensure postgres container is running."
    exit 1
fi
print_status "Service dependencies OK"

# Create test database
print_info "Creating scheduler-go-tests database..."
export PGPASSWORD=${POSTGRES_PASSWORD:-postgrespassword}

# Use a unique database name to avoid Hasura interference
TEST_DB_NAME="scheduler_go_test_$(date +%s)_$$"

# Drop database if it exists to ensure clean state
psql -h ${POSTGRES_HOST:-postgres} -U ${POSTGRES_USER:-postgres} -c "DROP DATABASE IF EXISTS \"$TEST_DB_NAME\";" 2>/dev/null

# Create fresh database
if psql -h ${POSTGRES_HOST:-postgres} -U ${POSTGRES_USER:-postgres} -c "CREATE DATABASE \"$TEST_DB_NAME\";" 2>/dev/null; then
    print_status "Test database created: $TEST_DB_NAME"
else
    print_error "Failed to create test database"
    exit 1
fi

# Setup test database schema
print_info "Setting up test database schema..."
if psql -h ${POSTGRES_HOST:-postgres} -U ${POSTGRES_USER:-postgres} -d "$TEST_DB_NAME" -f /app/scripts/setup-test-db.sql > /dev/null 2>&1; then
    print_status "Test database schema setup complete"
else
    print_error "Failed to setup test database schema"
    exit 1
fi

# Export the test database name for the tests to use
export POSTGRES_DB="$TEST_DB_NAME"

# Build go test command flags
GO_TEST_FLAGS="$VERBOSE_FLAG"

# Add timeout if specified, otherwise default
if [ -n "$TEST_TIMEOUT" ]; then
    GO_TEST_FLAGS="$GO_TEST_FLAGS -timeout $TEST_TIMEOUT"
else
    # Default timeout for specific runs
    GO_TEST_FLAGS="$GO_TEST_FLAGS -timeout 5m"
fi

# Handle specific runs for debugging (--run, --pkg) and exit early
if [ -n "$TEST_PACKAGE" ] || [ -n "$TEST_RUN_PATTERN" ]; then
    PACKAGE_TO_TEST="${TEST_PACKAGE:-./...}"
    if [ -n "$TEST_RUN_PATTERN" ]; then
        GO_TEST_FLAGS="$GO_TEST_FLAGS -run $TEST_RUN_PATTERN"
    fi
    
    print_info "Running specific test selection..."
    print_info "  Package: $PACKAGE_TO_TEST"
    print_info "  Command: go test $PACKAGE_TO_TEST $GO_TEST_FLAGS"
    
    if go test $PACKAGE_TO_TEST $GO_TEST_FLAGS; then
        print_status "Specific test run completed successfully! 🎉"
        exit 0
    else
        print_error "Specific test run failed"
        exit 1
    fi
fi

# --- Main Test Execution Logic ---

ANY_SUITE_FLAG_SET=false
if [ "$RUN_MEMORY_TESTS" = true ] || [ "$RUN_INTEGRATION_TESTS" = true ]; then
    ANY_SUITE_FLAG_SET=true
fi

# If specific suite flags are used, run only those. Otherwise, run everything.
if [ "$ANY_SUITE_FLAG_SET" = true ]; then
    print_info "Running custom test suites..."
    FINAL_EXIT_CODE=0

    if [ "$RUN_MEMORY_TESTS" = true ]; then
        print_info "Running memory tests..."
        if ! go test ./... $VERBOSE_FLAG -run 'Test.*Memory.*' -timeout 10m; then
            print_error "Memory tests failed"
            FINAL_EXIT_CODE=1
        else
            print_status "Memory tests passed"
        fi
    fi

    if [ "$RUN_INTEGRATION_TESTS" = true ]; then
        print_info "Running integration tests..."
        # Runs all tests that are NOT short tests
        if ! go test ./... $VERBOSE_FLAG -timeout 10m; then
            print_error "Integration tests failed"
            FINAL_EXIT_CODE=1
        else
            print_status "Integration tests passed"
        fi
    fi
    
    if [ $FINAL_EXIT_CODE -eq 0 ]; then
        print_status "Custom test run completed successfully! 🎉"
    fi
    exit $FINAL_EXIT_CODE
else
    # Default run: all tests with coverage
    print_info "Running all tests (unit, integration, memory) with coverage..."
    # We run without -short to include integration and memory tests in the coverage report
    if go test ./... $VERBOSE_FLAG -timeout 20m -coverprofile=coverage.out -covermode=atomic; then
        print_status "All tests passed"
        echo "📈 Coverage Summary:"
        go tool cover -func=coverage.out | tail -n 1
    else
        print_error "Some tests failed"
        exit 1
    fi
fi

# Build the binary to ensure it compiles
print_info "Building binary..."
if go build -o /tmp/scheduler ./cmd/scheduler; then
    print_status "Binary builds successfully"
else
    print_error "Binary build failed"
    exit 1
fi

print_status "All tests completed successfully! 🎉"

