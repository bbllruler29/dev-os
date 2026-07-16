-- ============================================================================
-- ContractIQ — Security Foundation (Stage 7)
--
-- Paste this entire file into the Supabase SQL Editor and run once.
-- Safe to re-run (idempotent — IF NOT EXISTS / DROP POLICY IF EXISTS / OR REPLACE).
--
-- This file is additive to database.sql / docs/specs/supabase-schema.sql, which
-- already create the application tables and their `user_id = auth.uid()` RLS
-- policies. This file:
--   1. Adds the `rate_limit_events` table used by lib/security/rateLimiter.ts
--   2. Re-affirms Row Level Security is enabled on every application table
--      (idempotent safety net in case RLS was ever disabled manually)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. rate_limit_events — sliding-window rate limiting
--
-- No user-facing policies are defined on purpose. All reads/writes go through
-- createAdminClient() (service role), so a compromised or malicious user
-- session can never read or tamper with their own (or anyone else's) counters.
--
-- `identifier` is intentionally a free-form text key, not a strict user_id FK:
-- authenticated actions (chat, contract_processing, contract_upload) key on
-- auth.uid(); the `auth` bucket (login/signup) keys on `ip:<address>` because
-- a failed login or a signup attempt has no user_id yet to attach to.
-- ----------------------------------------------------------------------------
create table if not exists rate_limit_events (
  id         uuid        primary key default gen_random_uuid(),
  identifier text        not null,
  action     text        not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_rate_limit_events_lookup
  on rate_limit_events (identifier, action, created_at desc);

alter table rate_limit_events enable row level security;
-- Intentionally no policies: service role bypasses RLS; no anon/authenticated
-- policy is created, so PostgREST/anon-key access is denied by default.

-- ----------------------------------------------------------------------------
-- 2. Re-affirm RLS is enabled on every application table
-- ----------------------------------------------------------------------------
alter table if exists contracts          enable row level security;
alter table if exists custom_key_terms   enable row level security;
alter table if exists key_terms          enable row level security;
alter table if exists chat_sessions      enable row level security;
alter table if exists chat_messages      enable row level security;
alter table if exists user_feedback      enable row level security;

-- ============================================================================
-- End of file
-- ============================================================================
