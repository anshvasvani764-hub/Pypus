-- Per-workspace config for the Receipt Agent automation (Automations >
-- Receipts > Configuration) — manual approval vs automatic WhatsApp send.
-- Mirrors fee_reminder_settings' send_mode column (see
-- 20260904000000_fee_reminder_settings.sql), but receipts don't need the
-- days_after_due/repeat_interval scheduling fields since a receipt is
-- generated the instant a payment is marked paid, not on a cron cycle.
--
-- Note: send_mode = 'auto' only stores the preference for now — actually
-- firing receipts automatically still needs AUTO_WHATSAPP_ENABLED flipped
-- on in lib/config/messaging.ts once a working WhatsApp Business number
-- is back (see that file's comment).
--
-- Also adds two columns to receipts:
--   whatsapp_message_override — lets the owner edit the WhatsApp script
--     shown in the Receipt Agent queue/popup before sending (defaults to
--     the auto-generated message from lib/agent/queries.ts when null).
--   agent_dismissed — lets the owner pull a receipt out of the pending
--     queue without it being counted as sent in the activity history.

create table if not exists public.receipt_agent_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  send_mode text not null default 'manual'
    check (send_mode in ('manual', 'auto')),
  updated_at timestamptz not null default now()
);

alter table public.receipt_agent_settings enable row level security;

create policy receipt_agent_settings_select_workspace on public.receipt_agent_settings
  for select
  to authenticated
  using (is_workspace_member(workspace_id) or is_workspace_owner(workspace_id));

create policy receipt_agent_settings_write_workspace on public.receipt_agent_settings
  for all
  to authenticated
  using (is_workspace_member(workspace_id) or is_workspace_owner(workspace_id))
  with check (is_workspace_member(workspace_id) or is_workspace_owner(workspace_id));

alter table public.receipts
  add column if not exists whatsapp_message_override text,
  add column if not exists agent_dismissed boolean not null default false;

-- Replaces the old partial index from agent-schema-v2.sql — pending now
-- also excludes dismissed receipts.
drop index if exists receipts_workspace_pending_idx;
create index if not exists receipts_workspace_pending_idx
  on public.receipts (workspace_id)
  where whatsapp_sent_at is null and agent_dismissed = false;
