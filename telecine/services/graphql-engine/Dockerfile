ARG HASURA_VERSION=latest
  
FROM hasura/graphql-engine:${HASURA_VERSION}

COPY ./metadata /hasura-metadata
COPY ./migrations /hasura-migrations