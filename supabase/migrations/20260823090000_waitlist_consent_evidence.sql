-- Consent evidence for the waitlist double opt-in, per standard German (UWG)
-- practice: alongside the request/confirmation timestamps and consent text
-- version, keep the IP address presented at the join request and at the
-- confirmation click, as demonstrable proof of consent (Art. 7(1) GDPR).
--
-- Data minimization balancing this: the web-waitlist function purges
-- unconfirmed rows ~30 days after their confirmation link expires, so request
-- evidence (email + IP) does not outlive an ask that was never confirmed.
-- The waitlist remains free-standing: still no link to accounts, folders,
-- tokens, or listening selections.

alter table public.web_waitlist
  add column if not exists requested_ip text,
  add column if not exists confirmed_ip text;
