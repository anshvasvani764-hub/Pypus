import Link from "next/link"
import { CheckCircle2, XCircle } from "lucide-react"
import { createServiceClient } from "@/lib/supabase/service"
import { getCashfreeOrderStatus } from "@/lib/payments/cashfree"
import { resolvePlan } from "@/lib/subscriptions/plans"
import { inter, jetbrainsMono } from "@/components/landing/fonts"
import styles from "@/components/subscribe/subscribe.module.css"

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
          const { data: payment } = await supabase
            .from("payments")
            .select("plan_id")
            .eq("cf_order_id", orderId)
            .maybeSingle()

          const { data: sub } = await supabase
            .from("workspace_subscriptions")
            .select("status")
            .eq("workspace_id", workspace.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()

          // Only backfill if the webhook hasn't already activated it.
          if (sub && sub.status !== "active") {
            const plan = resolvePlan(payment?.plan_id)
            const paidAt = new Date()
            const currentPeriodEnd = new Date(
              paidAt.getTime() + plan.cycleDays * 24 * 60 * 60 * 1000
            )
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
    <main className={`${styles.root} ${inter.variable} ${jetbrainsMono.variable}`}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.body}>
        <div className={styles.resultCard}>
          {paid ? (
            <>
              <div className={styles.resultIconWrap}>
                <CheckCircle2 size={26} />
              </div>
              <h1 className={styles.resultHeading}>Payment successful</h1>
              <p className={styles.resultSub}>
                Your subscription is active. You&apos;re all set for the next 30 days.
              </p>
              <Link
                href={`/${workspaceSlug}`}
                className={`${styles.resultLink} ${styles.resultLinkPrimary}`}
              >
                Go to your workspace
              </Link>
            </>
          ) : (
            <>
              <div className={`${styles.resultIconWrap} ${styles.fail}`}>
                <XCircle size={26} />
              </div>
              <h1 className={styles.resultHeading}>
                {checkError ? "Couldn't confirm payment" : "Payment not completed"}
              </h1>
              <p className={styles.resultSub}>
                {checkError
                  ? "We couldn't verify this payment right now. If money was deducted, it will reflect shortly."
                  : "Looks like the payment didn't go through. You can try again."}
              </p>
              <Link
                href={`/subscribe/${workspaceSlug}`}
                className={`${styles.resultLink} ${styles.resultLinkGhost}`}
              >
                Try again
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
