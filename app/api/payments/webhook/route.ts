import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import {
  verifyCashfreeWebhookSignature,
  getCashfreeOrderStatus,
} from "@/lib/payments/cashfree"
import { SAAS_PLAN } from "@/lib/subscriptions/plans"

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get("x-webhook-signature") || ""
  const timestamp = req.headers.get("x-webhook-timestamp") || ""

  if (!verifyCashfreeWebhookSignature(rawBody, timestamp, signature)) {
    console.error("Cashfree webhook: signature verification failed")
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let payload: { data?: { order?: { order_id?: string } } }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const cfOrderId = payload?.data?.order?.order_id
  if (!cfOrderId) {
    return NextResponse.json({ error: "Missing order_id in payload" }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: payment } = await supabase
    .from("payments")
    .select("id, workspace_id, status")
    .eq("cf_order_id", cfOrderId)
    .single()

  if (!payment) {
    console.error("Cashfree webhook: unknown order_id", cfOrderId)
    return NextResponse.json({ error: "Unknown order" }, { status: 404 })
  }

  // Never trust the webhook body alone to unlock paid access — re-confirm
  // directly with Cashfree server-to-server first.
  const orderStatus = await getCashfreeOrderStatus(cfOrderId)

  if (orderStatus.orderStatus !== "PAID") {
    await supabase
      .from("payments")
      .update({ status: "failed", raw_webhook_payload: payload, updated_at: new Date().toISOString() })
      .eq("id", payment.id)
    return NextResponse.json({ ok: true, note: "Order not paid, ignored" })
  }

  // Idempotency guard — Cashfree can retry the same webhook.
  if (payment.status === "success") {
    return NextResponse.json({ ok: true, note: "Already processed" })
  }

  const paidAt = new Date()
  const currentPeriodEnd = new Date(
    paidAt.getTime() + SAAS_PLAN.cycleDays * 24 * 60 * 60 * 1000
  )

  const { error: payUpdateErr } = await supabase
    .from("payments")
    .update({
      status: "success",
      paid_at: paidAt.toISOString(),
      raw_webhook_payload: payload,
      updated_at: paidAt.toISOString(),
    })
    .eq("id", payment.id)

  if (payUpdateErr) {
    console.error("Failed to update payment row:", payUpdateErr)
  }

  const { error: subErr } = await supabase
    .from("workspace_subscriptions")
    .update({
      status: "active",
      cf_order_id: cfOrderId,
      paid_at: paidAt.toISOString(),
      current_period_end: currentPeriodEnd.toISOString(),
      updated_at: paidAt.toISOString(),
    })
    .eq("workspace_id", payment.workspace_id)

  if (subErr) {
    console.error("Failed to activate subscription:", subErr)
    return NextResponse.json({ error: "Failed to activate subscription" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
