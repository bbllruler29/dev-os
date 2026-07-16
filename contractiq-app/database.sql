-- ============================================================================
-- ContractIQ — Database Schema
--
-- Source of truth for the ContractIQ database, derived from:
--   - docs/engineering/engineering-doc.md (Section 7 — Database Design and Schema)
--   - docs/specs/*.md (per-feature implementation specs)
--   - docs/specs/implementation-specification.md (consolidated spec, Section 4)
--
-- Paste this entire file into the Supabase SQL Editor and run once on a
-- fresh project. Safe to re-run (uses IF NOT EXISTS / OR REPLACE / ON CONFLICT
-- where applicable) but intended for a single fresh setup.
--
-- Covers, in dependency order:
--   1. Extensions
--   2. Shared trigger functions
--   3. Tables (contracts, custom_key_terms, key_terms, chat_sessions,
--      chat_messages, user_feedback), each with indexes, updated_at triggers,
--      and Row Level Security policies
--   4. term_corrections view (analytics, not a table)
--   5. Supabase Storage bucket + policies for uploaded PDFs
--
-- Authorization model: Postgres Row Level Security is the sole authorization
-- mechanism (FR-13). Every table's policy is `user_id = auth.uid()`. There is
-- no custom authorization middleware layer.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Extensions
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 2. Shared trigger function: auto-update `updated_at` on row update
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================================
-- 3a. Table: contracts
-- ============================================================================
create table if not exists contracts (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  contract_name           text not null,
  contract_type           text not null check (contract_type in ('NDA', 'MSA')),
  status                  text not null default 'uploaded' check (status in ('uploaded', 'processing', 'completed', 'error')),
  file_path               text,
  contract_text           text,
  page_count              int,
  processing_error        text,
  detected_contract_type  text check (detected_contract_type in ('NDA', 'MSA')),
  last_accessed_at        timestamptz not null default now(),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists idx_contracts_user_id on contracts(user_id);
create index if not exists idx_contracts_status on contracts(status);
create index if not exists idx_contracts_created_at on contracts(created_at);

drop trigger if exists trg_contracts_updated_at on contracts;
create trigger trg_contracts_updated_at
  before update on contracts
  for each row execute function set_updated_at();

alter table contracts enable row level security;

drop policy if exists "contracts_select_own" on contracts;
create policy "contracts_select_own" on contracts
  for select using (user_id = auth.uid());

drop policy if exists "contracts_insert_own" on contracts;
create policy "contracts_insert_own" on contracts
  for insert with check (user_id = auth.uid());

drop policy if exists "contracts_update_own" on contracts;
create policy "contracts_update_own" on contracts
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "contracts_delete_own" on contracts;
create policy "contracts_delete_own" on contracts
  for delete using (user_id = auth.uid());

-- ============================================================================
-- 3b. Table: custom_key_terms
-- ============================================================================
create table if not exists custom_key_terms (
  id           uuid primary key default gen_random_uuid(),
  contract_id  uuid not null references contracts(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  term_name    text not null,
  created_at   timestamptz not null default now()
);

create index if not exists idx_custom_key_terms_contract_id on custom_key_terms(contract_id);

-- Enforce max 5 custom key terms per contract (FR-05). A plain CHECK cannot
-- count sibling rows, so this must be a BEFORE INSERT trigger.
create or replace function enforce_max_custom_key_terms()
returns trigger as $$
begin
  if (select count(*) from custom_key_terms where contract_id = new.contract_id) >= 5 then
    raise exception 'A contract can have at most 5 custom key terms' using errcode = '23514';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_enforce_max_custom_key_terms on custom_key_terms;
create trigger trg_enforce_max_custom_key_terms
  before insert on custom_key_terms
  for each row execute function enforce_max_custom_key_terms();

alter table custom_key_terms enable row level security;

drop policy if exists "custom_key_terms_select_own" on custom_key_terms;
create policy "custom_key_terms_select_own" on custom_key_terms
  for select using (user_id = auth.uid());

drop policy if exists "custom_key_terms_insert_own" on custom_key_terms;
create policy "custom_key_terms_insert_own" on custom_key_terms
  for insert with check (user_id = auth.uid());

drop policy if exists "custom_key_terms_delete_own" on custom_key_terms;
create policy "custom_key_terms_delete_own" on custom_key_terms
  for delete using (user_id = auth.uid());

-- ============================================================================
-- 3c. Table: key_terms
-- ============================================================================
create table if not exists key_terms (
  id                  uuid primary key default gen_random_uuid(),
  contract_id         uuid not null references contracts(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  term_name           text not null,
  value               text not null,
  page_number         int not null,
  confidence_score    numeric(5,2) not null check (confidence_score between 0 and 100),
  source_sentence     text not null,
  is_manual           boolean not null default false,
  custom_key_term_id  uuid references custom_key_terms(id) on delete set null,
  is_edited           boolean not null default false,
  original_ai_value   text,
  edited_at           timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_key_terms_contract_id on key_terms(contract_id);
create index if not exists idx_key_terms_user_id on key_terms(user_id);

drop trigger if exists trg_key_terms_updated_at on key_terms;
create trigger trg_key_terms_updated_at
  before update on key_terms
  for each row execute function set_updated_at();

alter table key_terms enable row level security;

drop policy if exists "key_terms_select_own" on key_terms;
create policy "key_terms_select_own" on key_terms
  for select using (user_id = auth.uid());

drop policy if exists "key_terms_insert_own" on key_terms;
create policy "key_terms_insert_own" on key_terms
  for insert with check (user_id = auth.uid());

drop policy if exists "key_terms_update_own" on key_terms;
create policy "key_terms_update_own" on key_terms
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "key_terms_delete_own" on key_terms;
create policy "key_terms_delete_own" on key_terms
  for delete using (user_id = auth.uid());

-- ============================================================================
-- 3d. Table: chat_sessions (1:1 with contracts)
-- ============================================================================
create table if not exists chat_sessions (
  id           uuid primary key default gen_random_uuid(),
  contract_id  uuid not null unique references contracts(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_chat_sessions_user_id on chat_sessions(user_id);

drop trigger if exists trg_chat_sessions_updated_at on chat_sessions;
create trigger trg_chat_sessions_updated_at
  before update on chat_sessions
  for each row execute function set_updated_at();

alter table chat_sessions enable row level security;

drop policy if exists "chat_sessions_select_own" on chat_sessions;
create policy "chat_sessions_select_own" on chat_sessions
  for select using (user_id = auth.uid());

drop policy if exists "chat_sessions_insert_own" on chat_sessions;
create policy "chat_sessions_insert_own" on chat_sessions
  for insert with check (user_id = auth.uid());

-- ============================================================================
-- 3e. Table: chat_messages
-- ============================================================================
create table if not exists chat_messages (
  id                    uuid primary key default gen_random_uuid(),
  session_id            uuid not null references chat_sessions(id) on delete cascade,
  user_id               uuid not null references auth.users(id) on delete cascade,
  role                  text not null check (role in ('user', 'assistant')),
  content               text not null,
  citation_page         int,
  query_classification  text check (query_classification in ('contract', 'history', 'both')),
  created_at            timestamptz not null default now()
);

create index if not exists idx_chat_messages_session_created on chat_messages(session_id, created_at);

alter table chat_messages enable row level security;

drop policy if exists "chat_messages_select_own" on chat_messages;
create policy "chat_messages_select_own" on chat_messages
  for select using (user_id = auth.uid());

drop policy if exists "chat_messages_insert_own" on chat_messages;
create policy "chat_messages_insert_own" on chat_messages
  for insert with check (user_id = auth.uid());

-- ============================================================================
-- 3f. Table: user_feedback
-- ============================================================================
create table if not exists user_feedback (
  id           uuid primary key default gen_random_uuid(),
  contract_id  uuid not null references contracts(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  rating       text not null check (rating in ('up', 'down')),
  comment      text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_user_feedback_contract_id on user_feedback(contract_id);

alter table user_feedback enable row level security;

drop policy if exists "user_feedback_select_own" on user_feedback;
create policy "user_feedback_select_own" on user_feedback
  for select using (user_id = auth.uid());

drop policy if exists "user_feedback_insert_own" on user_feedback;
create policy "user_feedback_insert_own" on user_feedback
  for insert with check (user_id = auth.uid());

-- ============================================================================
-- 4. View: term_corrections (analytics — not a table)
-- Tracks every AI-extracted value a user has manually corrected, for
-- calibration monitoring and future model improvement. security_invoker
-- ensures RLS on the underlying key_terms table still applies through the view.
-- ============================================================================
create or replace view term_corrections
with (security_invoker = true) as
select
  contract_id,
  user_id,
  term_name,
  original_ai_value,
  value as corrected_value,
  confidence_score,
  edited_at
from key_terms
where is_edited = true;

-- ============================================================================
-- 5. Storage: `contracts` bucket (private) for uploaded PDFs
-- Path pattern: contracts/{user_id}/{contract_id}/{filename}.pdf
-- Non-blocking at upload time — if this bucket is unavailable, contracts.file_path
-- stays null and the app falls back to the text viewer (FR-06).
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('contracts', 'contracts', false)
on conflict (id) do nothing;

drop policy if exists "contracts_storage_select_own" on storage.objects;
create policy "contracts_storage_select_own" on storage.objects
  for select using (
    bucket_id = 'contracts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "contracts_storage_insert_own" on storage.objects;
create policy "contracts_storage_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'contracts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "contracts_storage_delete_own" on storage.objects;
create policy "contracts_storage_delete_own" on storage.objects
  for delete using (
    bucket_id = 'contracts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================================
-- End of schema
-- ============================================================================
