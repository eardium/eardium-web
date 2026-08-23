-- Eardium Web P1: number-only accounts, folders, private per-folder RSS feeds,
-- waitlist email capture (double opt-in), poll-based retention measurement.
--
-- All web_* tables are accessed exclusively by edge functions using the
-- service role. RLS is enabled with NO policies on purpose: anon/authenticated
-- clients are denied everything (deny-all), and the service role bypasses RLS.
-- Ownership checks happen in the edge functions (web-folders filters by
-- account_id derived from the presented account number).
--
-- This is the first migration in the dedicated Eardium Web project. Public
-- catalog audio remains a read-only external origin configured with
-- CATALOG_AUDIO_BASE_URL; this database owns no native-app tables or storage.

-- ─── Accounts ────────────────────────────────────────────────
-- Mullvad-style: a 16-digit account number is generated server-side and shown
-- to the user exactly once. Only its keyed HMAC-SHA-256 lookup hash is stored;
-- the HMAC key is a separate Edge Function secret, so a database copy alone
-- cannot be used to brute-force the 16-digit credential space offline.

create table if not exists public.web_accounts (
  id uuid primary key default gen_random_uuid(),
  account_number_hash text not null unique,
  created_at timestamptz not null default now()
);

alter table public.web_accounts enable row level security;

-- ─── Folders ─────────────────────────────────────────────────
-- One RSS feed per folder. feed_token is the capability credential (22-char
-- base64url of 16 random bytes). first/last_polled_at power the Gate A
-- retention metric: the feed handler stamps them on every poll, so no IPs,
-- user agents, or event stream are ever stored, and the signal survives
-- platform log retention limits.

create table if not exists public.web_folders (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.web_accounts(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  feed_token text not null unique,
  first_polled_at timestamptz,
  last_polled_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.web_folders enable row level security;

create index if not exists web_folders_account_idx
  on public.web_folders (account_id);

-- ─── Folder items ────────────────────────────────────────────
-- position is insertion order and is never renumbered on delete, so RSS guids,
-- pubDates, and episode numbers stay stable for podcast apps.

create table if not exists public.web_folder_items (
  folder_id uuid not null references public.web_folders(id) on delete cascade,
  catalog_id text not null,
  position integer not null check (position >= 1),
  added_at timestamptz not null default now(),
  primary key (folder_id, catalog_id)
);

alter table public.web_folder_items enable row level security;

-- Prevent two concurrent additions from receiving the same episode number.
create unique index if not exists web_folder_items_folder_position_uidx
  on public.web_folder_items (folder_id, position);

-- ─── Waitlist ────────────────────────────────────────────────
-- Deliberately free-standing: no FK and no column referencing accounts,
-- folders, tokens, or listening selections. Double opt-in: a row starts
-- pending (confirmed_at null) and is confirmed via a token link. Only
-- consent-confirmation evidence is retained.

create table if not exists public.web_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  confirm_token_hash text,
  confirm_token_expires_at timestamptz,
  confirmation_sent_at timestamptz,
  consent_version text not null default 'waitlist-v1',
  requested_at timestamptz not null default now(),
  confirmed_at timestamptz
);

-- Keep the migration safe to re-run if the first version of this table was
-- already applied. Confirmation tokens are single-use and cleared on success.
alter table public.web_waitlist
  alter column confirm_token_hash drop not null,
  add column if not exists confirm_token_expires_at timestamptz,
  add column if not exists confirmation_sent_at timestamptz,
  add column if not exists consent_version text not null default 'waitlist-v1';

alter table public.web_waitlist enable row level security;

create unique index if not exists web_waitlist_confirm_token_uidx
  on public.web_waitlist (confirm_token_hash)
  where confirm_token_hash is not null;
