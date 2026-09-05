-- Adds structured, editable WhatsApp template variables to receipts,
-- replacing the old freeform whatsapp_message_override text field for new
-- edits going forward (that column stays in place for any historical rows,
-- it's just no longer written to).
--
-- Shape: { name, amount, workspaceName, paymentMethod, validTillDate }
-- — the exact {{1}}-{{5}} values for the approved "payment_receipt"
-- template (see app/actions/agent.ts / lib/receipts/template-vars.ts).
-- When null, the Receipt Agent falls back to auto-computed defaults from
-- lib/agent/queries.ts. When set (the owner edited the fields in the
-- Receipt Agent's script modal), these exact values are sent to WhatsApp.

alter table public.receipts
  add column if not exists whatsapp_template_vars jsonb;
