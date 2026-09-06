-- Central log of every outbound WhatsApp Cloud API call, across all
-- workspaces, written from a single choke point (lib/whatsapp/client.ts)
-- so nothing has to remember to log itself. This is what the platform-level
-- cost dashboard reads from.
--
-- Meta does not return a message's billing category in the send response —
-- only the delivery/read status webhook confirms `pricing.category` /
-- `pricing.billable` (see app/api/whatsapp/webhook/route.ts). So each row
-- starts with our best-guess `category` at send time, and gets upgraded to
-- the authoritative `pricing_category` / `billable` once that webhook
-- lands. The dashboard should prefer pricing_category over category when
-- both are present.

create table if not exists public.wa_message_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  reason text not null check (reason in ('fee_reminder', 'receipt', 'manual', 'other')),
  template_name text,
  category text,                 -- our guess at send time: utility/marketing/authentication/service/unknown
  pricing_category text,         -- confirmed by Meta's status webhook (authoritative once set)
  billable boolean,              -- confirmed by Meta's status webhook
  country text not null default 'IN',
  to_phone text not null,
  message_id text,               -- Meta's message id — matched against webhook status callbacks
  send_status text not null default 'sent' check (send_status in ('sent', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  priced_at timestamptz          -- when the webhook confirmed pricing_category/billable
);

create index if not exists wa_message_log_workspace_created_idx
  on public.wa_message_log (workspace_id, created_at desc);

-- Only index rows that actually have a message_id (failed sends won't) —
-- this is the webhook's lookup key.
create index if not exists wa_message_log_message_id_idx
  on public.wa_message_log (message_id)
  where message_id is not null;

-- Editable per-category, per-country rate card (₹). Meta changes these
-- rates periodically and doesn't expose ₹ amount via API/webhook — the
-- webhook only confirms *which* category a message billed as. Seeded at 0;
-- fill in the real current rates from Meta Business Manager → WhatsApp
-- Manager → Billing before trusting the dashboard's ₹ numbers.
create table if not exists public.wa_rate_card (
  category text not null check (category in ('utility', 'marketing', 'authentication', 'service', 'unknown')),
  country text not null default 'IN',
  price_inr numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (category, country)
);

insert into public.wa_rate_card (category, country, price_inr)
values
  ('utility', 'IN', 0),
  ('marketing', 'IN', 0),
  ('authentication', 'IN', 0),
  ('service', 'IN', 0),
  ('unknown', 'IN', 0)
on conflict (category, country) do nothing;
