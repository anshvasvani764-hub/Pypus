import { createServiceClient } from "@/lib/supabase/service"

export type SubscriptionState =
  | { allowed: true; status: "trialing"; daysLeft: number; trialEndsAt: string }
  | { allowed: true; status: "active"; currentPeriodEnd: string | null }
  | { allowed: false; status: "trial_expired" | "expired" | "cancelled" | "none" }

/**
 * Reads the latest workspace_subscriptions row for a workspace and decides
 * whether the workspace should currently be allowed into the app.
 *
 * Uses the service-role client because this runs in the layout on every
 * request, before we know if the caller is even a member yet — it is a
 * read of subscription status only, never used to read gym data.
 */
export async function getSubscriptionState(
  workspaceId: string
): Promise<SubscriptionState> {
  if (!workspaceId) {
    return { allowed: false, status: "none" }
  }

  const supabase = createServiceClient()
  const { data: sub, error } = await supabase
    .from("workspace_subscriptions")
    .select("status, trial_ends_at, current_period_end")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("getSubscriptionState error:", error)
  }

  if (!sub) {
    return { allowed: false, status: "none" }
  }

  const now = Date.now()

  if (sub.status === "active") {
    if (sub.current_period_end && new Date(sub.current_period_end).getTime() < now) {
      return { allowed: false, status: "expired" }
    }
    return { allowed: true, status: "active", currentPeriodEnd: sub.current_period_end }
  }

  if (sub.status === "trialing") {
    const trialEndsAt = sub.trial_ends_at
    if (!trialEndsAt || new Date(trialEndsAt).getTime() < now) {
      return { allowed: false, status: "trial_expired" }
    }
    const daysLeft = Math.max(
      0,
      Math.ceil((new Date(trialEndsAt).getTime() - now) / (24 * 60 * 60 * 1000))
    )
    return { allowed: true, status: "trialing", daysLeft, trialEndsAt }
  }

  if (sub.status === "cancelled") {
    return { allowed: false, status: "cancelled" }
  }

  return { allowed: false, status: "expired" }
}
