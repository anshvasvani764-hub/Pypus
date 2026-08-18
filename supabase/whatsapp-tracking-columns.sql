-- Track real WhatsApp Cloud API delivery on reminders + receipts, so the
-- Agent tab can show whether a message actually sent vs failed (e.g. outside
-- the 24h window / template not approved yet), instead of assuming success.
-- Run this in Supabase SQL editor (or via Supabase MCP) before deploying.

alter table public.reminders
  add column if not exists whatsapp_message_id text,
  add column if not exists whatsapp_status text default 'sent'; -- 'sent' | 'failed'

alter table public.receipts
  add column if not exists whatsapp_message_id text,
  add column if not exists whatsapp_status text; -- 'sent' | 'failed', null = not attempted yet
