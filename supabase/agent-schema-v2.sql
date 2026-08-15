-- Agent module v2: track whether a receipt has been sent to the member yet,
-- so unsent receipts show up as a "Pending task" in the Agent tab, and
-- move to "Recent activity" once the owner taps Send.
-- Run this in Supabase SQL editor (or via Supabase MCP) before deploying the code.

alter table public.receipts
  add column if not exists whatsapp_sent_at timestamptz;

create index if not exists receipts_workspace_pending_idx
  on public.receipts (workspace_id)
  where whatsapp_sent_at is null;
