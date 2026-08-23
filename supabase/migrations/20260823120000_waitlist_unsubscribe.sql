-- One-click unsubscribe for the waitlist.
--
-- The confirmation token is deliberately single-use and cleared on confirm, so
-- it cannot double as an unsubscribe credential — a confirmed subscriber would
-- have nothing left to present. This is a separate token that lives as long as
-- the row does, carried in the List-Unsubscribe header and the message body of
-- every email we send.
--
-- Stored as a SHA-256 hash for the same reason as the confirmation token: the
-- plaintext exists only inside the recipient's mailbox, so a database copy
-- alone does not let anyone unsubscribe on someone else's behalf.

alter table public.web_waitlist
  add column if not exists unsubscribe_token_hash text;

create unique index if not exists web_waitlist_unsubscribe_token_uidx
  on public.web_waitlist (unsubscribe_token_hash)
  where unsubscribe_token_hash is not null;
