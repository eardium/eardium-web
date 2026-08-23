-- Durable per-IP rate limiting for the public, unauthenticated actions
-- (account create/login, waitlist join). The earlier in-memory limiter
-- measurably limited nothing on the deployed project — Supabase recycles
-- Edge Function isolates too aggressively for a Map to accumulate — so the
-- counters live in one small table instead: fixed hourly windows, one row
-- per (bucket, ip, window).
--
-- Deliberately minimal: no sliding windows, no token buckets. One atomic
-- upsert-increment per request via web_rate_limit_hit, which also deletes
-- rows older than two windows, so the table stays tiny and IP counters are
-- never retained beyond ~2 hours (privacy: Art. 6(1)(f) abuse protection).

create table if not exists public.web_rate_limits (
  bucket text not null,
  ip text not null,
  window_start timestamptz not null,
  count integer not null default 1,
  primary key (bucket, ip, window_start)
);

alter table public.web_rate_limits enable row level security;

create or replace function public.web_rate_limit_hit(
  p_bucket text,
  p_ip text,
  p_window_start timestamptz
) returns integer
language sql
as $$
  delete from public.web_rate_limits
    where window_start < now() - interval '2 hours';
  insert into public.web_rate_limits (bucket, ip, window_start, count)
    values (p_bucket, p_ip, p_window_start, 1)
    on conflict (bucket, ip, window_start)
    do update set count = web_rate_limits.count + 1
    returning count;
$$;

-- Only the service role (edge functions) may count; the table itself is
-- deny-all under RLS like every other web_* table. The table grant is
-- explicit rather than relying on the platform's default privileges — the
-- function is SECURITY INVOKER, so the caller needs both.
revoke all on function public.web_rate_limit_hit(text, text, timestamptz) from public;
grant execute on function public.web_rate_limit_hit(text, text, timestamptz) to service_role;
grant select, insert, update, delete on public.web_rate_limits to service_role;
