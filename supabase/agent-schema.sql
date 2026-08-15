-- Agent module schema for Supabase
-- receipts and reminders tables already existed in production with RLS +
-- policies in place. This migration only ALTERs them — it does not
-- create new tables. Already applied to production via Supabase MCP on
-- 2026-08-15; kept here so the schema is versioned in the repo too.

alter table public.receipts
  add column if not exists member_id uuid references public.members(id) on delete cascade,
  add column if not exists amount numeric,
  add column if not exists payment_method text,
  add column if not exists paid_date date;

create index if not exists receipts_member_id_idx
  on public.receipts (member_id);

create index if not exists receipts_workspace_id_idx
  on public.receipts (workspace_id);

alter table public.reminders
  add column if not exists reason text;

create index if not exists reminders_workspace_id_sent_at_idx
  on public.reminders (workspace_id, sent_at desc);
