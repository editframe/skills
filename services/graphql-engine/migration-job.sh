set -e

echo "ℹ️  Applying migrations..."
echo Endpoint: ${HASURA_GRAPHQL_ENDPOINT}
hasura --skip-update-check \
  migrate apply --database-name ef-telecine --admin-secret ${HASURA_GRAPHQL_ADMIN_SECRET}

echo "ℹ️  Applying metadata..."
hasura --skip-update-check \
  metadata apply --admin-secret ${HASURA_GRAPHQL_ADMIN_SECRET}

echo "✅ Migrations and metadata applied successfully"