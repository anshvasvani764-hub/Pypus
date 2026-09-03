-- Per-workspace config for the Fee Reminders automation (Automations >
-- Fee reminders > Settings). One row per workspace — enabled flag, how many
-- days after the due date reminders start, how often they repeat, and
-- whether sends need manual approval or go out automatically.
--
-- Note: send_mode = 'auto' only stores the preference for now. Actually
-- firing reminders on a schedule needs the cron job described in the
-- Automations plan — not part of this migration. Automatic WhatsApp
-- sending is also globally off right now (see lib/config/messaging.ts,
-- AUTO_WHATSAPP_ENABLED) until a working business number is back.

create table if not exists public.fee_reminder_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  enabled boolean not null default false,
  days_after_due int not null default 1,
  repeat_interval text not null default 'once'
    check (repeat_interval in ('daily', 'every_2_days', 'once')),
  send_mode text not null default 'manual'
    check (send_mode in ('manual', 'auto')),
  updated_at timestamptz not null default now()
);

alter table public.fee_reminder_settings enable row level security;

create policy fee_reminder_settings_select_workspace on public.fee_reminder_settings
  for select
  to authenticated
  using (is_workspace_member(workspace_id) or is_workspace_owner(workspace_id));

create policy fee_reminder_settings_write_workspace on public.fee_reminder_settings
  for all
  to authenticated
  using (is_workspace_member(workspace_id) or is_workspace_owner(workspace_id))
  with check (is_workspace_member(workspace_id) or is_workspace_owner(workspace_id));
