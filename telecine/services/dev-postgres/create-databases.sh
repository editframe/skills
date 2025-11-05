#!/usr/bin/env bash

# This file is expected to be run at the creation of any databases

# Function to create a database if it doesn't exist
create_database_if_not_exists() {
    if ! psql -U postgres -lqt | cut -d \| -f 1 | grep -qw $1; then
        createdb -U postgres $1
        echo "Database $1 created."
    else
        echo "Database $1 already exists."
    fi
}

# Create telecine-test database
create_database_if_not_exists telecine-test

# Create telecine-dev database
create_database_if_not_exists telecine-dev

echo "Database creation process completed."
