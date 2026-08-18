// Single source of truth for the Pypus SaaS subscription plan.
// (Not to be confused with `plans` table — that's each gym's own
// membership plans for THEIR members. This is what a gym owner pays
// Pypus to use the product.)

export const SAAS_PLAN = {
  id: "growth",
  name: "Growth",
  amount: 999,
  currency: "INR",
  billingPeriod: "monthly" as const,
  trialDays: 14,
  cycleDays: 30,
} as const

// ₹19 stand-in for the real plan — same cycle, tiny amount, so a real
// Cashfree payment can be tested end-to-end without spending ₹999.
// Only reachable via /subscribe/[slug]?test=1 — never shown by default.
export const TEST_PLAN = {
  id: "test",
  name: "Test",
  amount: 19,
  currency: "INR",
  billingPeriod: "monthly" as const,
  trialDays: 14,
  cycleDays: 30,
} as const

export type SaasPlan = typeof SAAS_PLAN | typeof TEST_PLAN

export function resolvePlan(planId?: string | null): SaasPlan {
  return planId === TEST_PLAN.id ? TEST_PLAN : SAAS_PLAN
}
