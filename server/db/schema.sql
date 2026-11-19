-- PostgreSQL-Ready Data Layer Schema for Rebuild the Web
-- Compatible with PostgreSQL 15+ (Neon, Supabase, Cloud SQL, or self-hosted).
-- The runtime ProjectRepository interface in server/db/repository.ts maps directly to these tables.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  mode VARCHAR(16) NOT NULL CHECK (mode IN ('rebuild', 'redesign')),
  redesign_direction VARCHAR(32),
  status VARCHAR(24) NOT NULL CHECK (status IN ('draft', 'analyzing', 'blueprint_ready', 'completed', 'error')),
  is_example BOOLEAN NOT NULL DEFAULT FALSE,
  thumbnail_url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analysis_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  final_url TEXT NOT NULL,
  page_title TEXT,
  engine VARCHAR(32) NOT NULL,
  screenshots JSONB NOT NULL DEFAULT '{}'::jsonb,
  visual_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  dom_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  typography JSONB NOT NULL DEFAULT '{}'::jsonb,
  colors JSONB NOT NULL DEFAULT '{}'::jsonb,
  assets JSONB NOT NULL DEFAULT '[]'::jsonb,
  responsive JSONB NOT NULL DEFAULT '[]'::jsonb,
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  schema_version INTEGER NOT NULL DEFAULT 1,
  blueprint_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  language VARCHAR(24) NOT NULL,
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, file_path)
);

CREATE TABLE IF NOT EXISTS comparison_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  metrics JSONB NOT NULL,
  summary TEXT NOT NULL,
  findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role VARCHAR(16) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  proposed_changes JSONB,
  status VARCHAR(16),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_files_project ON project_files (project_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_project ON ai_chat_messages (project_id, created_at ASC);
