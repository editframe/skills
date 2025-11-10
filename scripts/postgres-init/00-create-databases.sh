#!/bin/bash
set -e

# This script will be run on first container startup
# Creates database for main worktree
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE "telecine-main";
    GRANT ALL PRIVILEGES ON DATABASE "telecine-main" TO postgres;
EOSQL

echo "Created telecine-main database"

