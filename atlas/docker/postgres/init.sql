-- =============================================================
-- ATLAS PostgreSQL Initialization Script
-- Runs once when the container is first created.
-- =============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- Full-text search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- GIN indexes on b-tree types

-- The application database is created by POSTGRES_DB env var.
-- Prisma migrations will create and manage all tables.
-- This script only sets up extensions and initial configuration.

-- Set default search path
ALTER DATABASE atlas_db SET search_path TO public;
