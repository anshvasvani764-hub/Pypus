import { NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Receives Meta's WhatsApp Cloud API webhook callbacks.
 *
 * Setup on Meta's side (one-time, in the Meta App dashboard →
 * WhatsApp → Configuration → Webhook):
 *   Callback URL:    https://pypus.in/api/whatsapp/webhook
 *   Verify token:    same value as WHATSAPP_WEBHOOK_VERIFY_TOKEN env var
 *   Subscribe to:    "messages" field (this carries delivery/read status,
 *                    which is what includes the `pricing` object below)
 *
 * Why this exists: Meta doesn't return a message's billing category in the
 * send response (see lib/whatsapp/client.ts) — it only appears later, on a
 * delivered/read status webhook, as:
 *   "pricing": { "billable": true, "category": "utility", ... }
 * This route matches that back to the wa_message_log row (by message_id,
 * written at send time) and fills in pricing_category/billable, so the
 * cost dashboard's numbers become Meta-confirmed instead of just guesses.
 *
 * Env vars needed:
 *   WHATSAPP_WEBHOOK_VERIFY_TOKEN — any string you pick, must match what's
 *     entered in the Meta dashboard's "Verify token" field.
 *   WHATSAPP_APP_SECRET — optional but recommended, from the Meta App's
 *     Settings → Basic → App Secret. If set, incoming payloads are
 *     signature-checked; if unset, that check is skipped (payload is still
 *     processed — don't block on this to get the pipeline live).
 */

// --- GET: Meta's one-time verification handshake ---
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }

  return NextResponse.json({ error: "verification failed" }, { status: 403 });
}

function isValidSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) return true; // not configured yet — don't block the pipeline on this
  if (!signatureHeader) return false;

  const expected =
    "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
  } catch {
    return false; // length mismatch etc. — treat as invalid, not a crash
  }
}

interface MetaStatusEntry {
  id: string; // this is the WhatsApp message id — matches wa_message_log.message_id
  status: string; // sent | delivered | read | failed
  pricing?: {
    billable?: boolean;
    category?: string; // utility | marketing | authentication | service
    pricing_model?: string;
    type?: string;
  };
}

// --- POST: actual status callbacks ---
export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!isValidSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  // Always parse defensively — Meta retries on non-200, so a malformed
  // payload here shouldn't turn into an infinite retry loop.
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: true }); // ack anyway, nothing we can do with it
  }

  const supabase = createServiceClient();

  const statuses: MetaStatusEntry[] =
    payload?.entry?.flatMap((entry: any) =>
      entry?.changes?.flatMap((change: any) => change?.value?.statuses ?? []) ?? []
    ) ?? [];

  for (const status of statuses) {
    if (!status?.id || !status.pricing) continue; // only status updates that actually carry pricing are useful here

    const { error } = await supabase
      .from("wa_message_log")
      .update({
        pricing_category: status.pricing.category ?? null,
        billable: status.pricing.billable ?? null,
        priced_at: new Date().toISOString(),
      })
      .eq("message_id", status.id);

    if (error) {
      console.error("whatsapp webhook: failed to update wa_message_log", status.id, error);
    }
  }

  // Meta expects a fast 200 — always ack even if a row didn't match
  // (e.g. a message sent before this table existed).
  return NextResponse.json({ ok: true });
}
