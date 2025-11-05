-- Setup test database schema for integration tests
-- This creates the minimal schema needed for scheduler-go integration tests

-- Drop existing tables to ensure clean schema
DROP TABLE IF EXISTS "video2"."process_html_attempts" CASCADE;
DROP TABLE IF EXISTS "video2"."process_html" CASCADE;
DROP TABLE IF EXISTS "video2"."process_isobmff" CASCADE;
DROP TABLE IF EXISTS "video2"."renders" CASCADE;
DROP TABLE IF EXISTS "video2"."unprocessed_files" CASCADE;
DROP TABLE IF EXISTS "identity"."api_keys" CASCADE;
DROP TABLE IF EXISTS "identity"."orgs" CASCADE;
DROP TABLE IF EXISTS "identity"."users" CASCADE;

-- Create schemas
CREATE SCHEMA IF NOT EXISTS "video2";
CREATE SCHEMA IF NOT EXISTS "identity";

-- Create identity tables (minimal for foreign key constraints)
CREATE TABLE "identity"."users" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    PRIMARY KEY ("id")
);

CREATE TABLE "identity"."orgs" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    PRIMARY KEY ("id")
);

CREATE TABLE "identity"."api_keys" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "org_id" uuid NOT NULL,
    PRIMARY KEY ("id"),
    FOREIGN KEY ("org_id") REFERENCES "identity"."orgs"("id") ON UPDATE restrict ON DELETE restrict
);

-- Create video2 tables needed for integration tests
CREATE TABLE "video2"."unprocessed_files" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "creator_id" uuid NOT NULL,
    PRIMARY KEY ("id"),
    FOREIGN KEY ("creator_id") REFERENCES "identity"."users"("id") ON UPDATE restrict ON DELETE restrict
);

CREATE TABLE "video2"."renders" (
    "id" text NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "creator_id" uuid NOT NULL,
    "org_id" uuid NOT NULL,
    "api_key_id" uuid,
    "status" text NOT NULL,
    "fps" numeric NOT NULL DEFAULT 30,
    "width" integer NOT NULL DEFAULT 1920,
    "height" integer NOT NULL DEFAULT 1080,
    "work_slice_ms" integer NOT NULL DEFAULT 1000,
    "started_at" timestamptz,
    "completed_at" timestamptz,
    "failed_at" timestamptz,
    "attempt_count" integer NOT NULL DEFAULT 0,
    "initializer_complete" boolean NOT NULL DEFAULT false,
    "failure_detail" jsonb,
    "output_config" jsonb,
    PRIMARY KEY ("id"),
    FOREIGN KEY ("creator_id") REFERENCES "identity"."users"("id") ON UPDATE restrict ON DELETE restrict,
    FOREIGN KEY ("org_id") REFERENCES "identity"."orgs"("id") ON UPDATE restrict ON DELETE restrict,
    FOREIGN KEY ("api_key_id") REFERENCES "identity"."api_keys"("id") ON UPDATE restrict ON DELETE restrict
);

CREATE TABLE "video2"."process_isobmff" (
    "id" text NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "started_at" timestamptz,
    "completed_at" timestamptz,
    "failed_at" timestamptz,
    "unprocessed_file_id" uuid,
    "org_id" uuid,
    "creator_id" uuid,
    "api_key_id" uuid,
    "source_type" text,
    "url" text,
    "attempt_count" integer NOT NULL DEFAULT 0,
    PRIMARY KEY ("id"),
    FOREIGN KEY ("unprocessed_file_id") REFERENCES "video2"."unprocessed_files"("id") ON UPDATE restrict ON DELETE restrict,
    FOREIGN KEY ("org_id") REFERENCES "identity"."orgs"("id") ON UPDATE restrict ON DELETE restrict,
    FOREIGN KEY ("creator_id") REFERENCES "identity"."users"("id") ON UPDATE restrict ON DELETE restrict,
    FOREIGN KEY ("api_key_id") REFERENCES "identity"."api_keys"("id") ON UPDATE restrict ON DELETE restrict
);

CREATE TABLE "video2"."process_html" (
    "id" text NOT NULL,
    "started_at" timestamptz DEFAULT now(),
    "completed_at" timestamptz,
    "failed_at" timestamptz,
    "render_id" text NOT NULL,
    "attempt_count" integer NOT NULL DEFAULT 0,
    "org_id" uuid NOT NULL,
    "api_key_id" uuid,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "html" text,
    "creator_id" uuid,
    PRIMARY KEY ("id"),
    FOREIGN KEY ("org_id") REFERENCES "identity"."orgs"("id") ON UPDATE restrict ON DELETE no action,
    FOREIGN KEY ("api_key_id") REFERENCES "identity"."api_keys"("id") ON UPDATE restrict ON DELETE no action,
    FOREIGN KEY ("creator_id") REFERENCES "identity"."users"("id") ON UPDATE restrict ON DELETE no action
);

CREATE TABLE "video2"."process_html_attempts" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "process_html_id" text NOT NULL,
    PRIMARY KEY ("id")
);

-- Enable pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert test data for foreign key constraints
INSERT INTO "identity"."users" ("id") VALUES 
    ('00000000-0000-0000-0000-000000000001'::uuid),
    ('00000000-0000-0000-0000-000000000002'::uuid)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "identity"."orgs" ("id") VALUES 
    ('00000000-0000-0000-0000-000000000001'::uuid),
    ('00000000-0000-0000-0000-000000000002'::uuid)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "identity"."api_keys" ("id", "org_id") VALUES 
    ('00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid),
    ('00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000002'::uuid)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "video2"."unprocessed_files" ("id", "creator_id") VALUES 
    ('00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid),
    ('00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000002'::uuid)
ON CONFLICT ("id") DO NOTHING;
