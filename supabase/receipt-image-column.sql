-- Stores the public Supabase Storage URL of the generated receipt image, so
-- it can be passed as the header image link when sending the payment_receipt
-- WhatsApp template. Run this in Supabase SQL editor before deploying.
-- (Companion to whatsapp-tracking-columns.sql — run both.)

alter table public.receipts
  add column if not exists receipt_image_url text;
