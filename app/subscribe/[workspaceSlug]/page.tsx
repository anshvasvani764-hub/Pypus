import { notFound } from "next/navigation"
import { createServiceClient } from "@/lib/supabase/service"
import { SAAS_PLAN } from "@/lib/subscriptions/plans"
import { SubscribeButton } from "@/components/subscribe/SubscribeButton"

const REASON_COPY: Record<string, { heading: string; body: string }> = {
  trial_expired: {
    heading: "Your 14-day free trial has ended",
    body: "Subscribe to keep using Pypus for your gym — your data is safe and picks up right where you left off.",
  },
  expired: {
    heading: "Your subscription has expired",
    body: "Renew to get back into your workspace — your data is safe and picks up right where you left off.",
  },
  cancelled: {
    heading: "Your subscription was cancelled",
    body: "Resubscribe anytime to get back into your workspace.",
  },
  none: {
    heading: "Set up billing to continue",
    body: "This workspace doesn't have a subscription yet.",
  },
}

export default async function SubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string }>
  searchParams: Promise<{ reason?: string }>
}) {
  const { workspaceSlug } = await params
  const { reason } = await searchParams

  const supabase = createServiceClient()
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("slug", workspaceSlug)
    .single()

  if (!workspace) {
    notFound()
  }

  const copy = REASON_COPY[reason || "none"] ?? REASON_COPY.none

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#08080A] px-4 py-12 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0F0F12] p-8">
        <p className="text-sm font-medium text-[#10B981]">{workspace.name}</p>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">{copy.heading}</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/60">{copy.body}</p>

        <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-base font-medium">{SAAS_PLAN.name} plan</span>
            <span className="text-2xl font-bold">
              ₹{SAAS_PLAN.amount}
              <span className="text-sm font-normal text-white/50">/mo</span>
            </span>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-white/70">
            <li>Access to every feature</li>
            <li>24/7 support</li>
            <li>One branch / franchise</li>
          </ul>
        </div>

        <div className="mt-6">
          <SubscribeButton workspaceSlug={workspaceSlug} />
        </div>

        <p className="mt-4 text-center text-xs text-white/40">
          Payments are processed securely by Cashfree. Your subscription renews every 30 days
          from your payment date.
        </p>
      </div>
    </main>
  )
}
