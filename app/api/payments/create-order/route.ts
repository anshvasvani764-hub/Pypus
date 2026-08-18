import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { createCashfreeOrder } from "@/lib/payments/cashfree"
import { SAAS_PLAN } from "@/lib/subscriptions/plans"

export async function POST(req: NextRequest) {
  try {
    const { workspaceSlug } = await req.json()

    if (!workspaceSlug || typeof workspaceSlug !== "string") {
      return NextResponse.json({ error: "workspaceSlug is required" }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: workspace, error: wsErr } = await supabase
      .from("workspaces")
      .select("id, owner_id, settings")
      .eq("slug", workspaceSlug)
      .single()

    if (wsErr || !workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    }

    const { data: owner } = await supabase
      .from("users")
      .select("email, phone")
      .eq("id", workspace.owner_id)
      .single()

    const phone =
      owner?.phone ||
      (workspace.settings as { phone?: string } | null)?.phone ||
      "9999999999"

    const orderId = `pypus_${workspace.id}_${Date.now()}`
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pypus.in"

    const { orderId: cfOrderId, paymentSessionId } = await createCashfreeOrder({
      orderId,
      amount: SAAS_PLAN.amount,
      customerId: workspace.owner_id,
      customerPhone: phone.replace(/^\+91/, ""),
      customerEmail: owner?.email,
      returnUrl: `${appUrl}/subscribe/${workspaceSlug}/return?order_id=${orderId}`,
      notifyUrl: `${appUrl}/api/payments/webhook`,
    })

    // Log the attempt immediately (status "initiated") so we have a row to
    // update from the webhook, and so a payment_session_id can never be
    // generated for a workspace that doesn't exist in our own DB.
    const { error: payErr } = await supabase.from("payments").insert({
      workspace_id: workspace.id,
      cf_order_id: cfOrderId,
      amount: SAAS_PLAN.amount,
      status: "initiated",
    })

    if (payErr) {
      console.error("Failed to log payment attempt:", payErr)
    }

    return NextResponse.json({ orderId: cfOrderId, paymentSessionId })
  } catch (err) {
    console.error("create-order error:", err)
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}
