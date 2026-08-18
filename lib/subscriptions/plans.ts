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
