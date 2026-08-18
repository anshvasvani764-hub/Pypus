import Link from "next/link"
import { createServiceClient } from "@/lib/supabase/service"
import { getCashfreeOrderStatus } from "@/lib/payments/cashfree"

export default async function SubscribeReturnPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string }>
  searchParams: Promise<{ order_id?: string }>
}) {
  const { workspaceSlug } = await params
  const { order_id: orderId } = await searchParams

  let paid = false
  let checkError = false

  if (orderId) {
    try {
      const status = await getCashfreeOrderStatus(orderId)
      paid = status.orderStatus === "PAID"

      // Webhooks can lag behind the redirect by a few seconds. If Cashfree
      // already confirms PAID here, activate immediately instead of making
      // the gym owner wait on the webhook.
      if (paid) {
        const supabase = createServiceClient()
        const { data: workspace } = await supabase
          .from("workspaces")
          .select("id")
          .eq("slug", workspaceSlug)
          .single()

        if (workspace) {
          const { data: sub } = await supabase
            .from("workspace_subscriptions")
            .select("status")
            .eq("workspace_id", workspace.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()

          // Only backfill if the webhook hasn't already activated it.
          if (sub && sub.status !== "active") {
            const paidAt = new Date()
            const currentPeriodEnd = new Date(paidAt.getTime() + 30 * 24 * 60 * 60 * 1000)
            await supabase
              .from("workspace_subscriptions")
              .update({
                status: "active",
                cf_order_id: orderId,
                paid_at: paidAt.toISOString(),
                current_period_end: currentPeriodEnd.toISOString(),
                updated_at: paidAt.toISOString(),
              })
              .eq("workspace_id", workspace.id)
          }
        }
      }
    } catch (err) {
      console.error("Return page order status check failed:", err)
      checkError = true
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#08080A] px-4 py-12 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0F0F12] p-8 text-center">
        {paid ? (
          <>
            <h1 className="text-2xl font-semibold text-[#10B981]">Payment successful</h1>
            <p className="mt-3 text-sm text-white/60">
              Your subscription is active. You&apos;re all set for the next 30 days.
            </p>
            <Link
              href={`/${workspaceSlug}`}
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#10B981] px-6 py-3 text-base font-semibold text-white transition-colors duration-200 hover:bg-[#059669] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#10B981]"
            >
              Go to your workspace
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold">
              {checkError ? "Couldn't confirm payment" : "Payment not completed"}
            </h1>
            <p className="mt-3 text-sm text-white/60">
              {checkError
                ? "We couldn't verify this payment right now. If money was deducted, it will reflect shortly."
                : "Looks like the payment didn't go through. You can try again."}
            </p>
            <Link
              href={`/subscribe/${workspaceSlug}`}
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg border border-white/20 px-6 py-3 text-base font-semibold text-white transition-colors duration-200 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#10B981]"
            >
              Try again
            </Link>
          </>
        )}
      </div>
    </main>
  )
}
