import { notFound } from "next/navigation"
import Link from "next/link"
import { ShieldCheck, Check } from "lucide-react"
import { createServiceClient } from "@/lib/supabase/service"
import { SAAS_PLAN, TEST_PLAN } from "@/lib/subscriptions/plans"
import { SubscribeButton } from "@/components/subscribe/SubscribeButton"
import { inter, jetbrainsMono } from "@/components/landing/fonts"
import styles from "@/components/subscribe/subscribe.module.css"

const REASON_COPY: Record<string, { heading: string; body: string; pill: string; amber: boolean }> = {
  trial_expired: {
    heading: "Your 14-day free trial has ended",
    body: "Subscribe to keep using Pypus for your gym — your data is safe and picks up right where you left off.",
    pill: "Trial ended",
    amber: true,
  },
  expired: {
    heading: "Your subscription has expired",
    body: "Renew to get back into your workspace — your data is safe and picks up right where you left off.",
    pill: "Subscription expired",
    amber: true,
  },
  cancelled: {
    heading: "Your subscription was cancelled",
    body: "Resubscribe anytime to get back into your workspace.",
    pill: "Cancelled",
    amber: true,
  },
  none: {
    heading: "Set up billing to continue",
    body: "This workspace doesn't have a subscription yet.",
    pill: "Billing required",
    amber: false,
  },
}

const FEATURES = [
  "Access to every feature",
  "24/7 support",
  "One branch / franchise",
]

export default async function SubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string }>
  searchParams: Promise<{ reason?: string; test?: string }>
}) {
  const { workspaceSlug } = await params
  const { reason, test } = await searchParams

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
  const isTest = test === "1"
  const plan = isTest ? TEST_PLAN : SAAS_PLAN

  return (
    <main className={`${styles.root} ${inter.variable} ${jetbrainsMono.variable}`}>
      <div className={styles.glow} aria-hidden="true" />

      <div className={styles.header}>
        <Link href="/" className={styles.logo}>
          <img src="/logo.png" alt="" className={styles.logoMark} />
          Pypus
        </Link>
      </div>

      <div className={styles.body}>
        <p className={styles.workspace}>{workspace.name}</p>

        <span className={`${styles.pill} ${copy.amber ? styles.pillAmber : ""}`}>
          <span className={styles.pillDot} />
          {copy.pill}
        </span>

        <h1 className={styles.heading}>{copy.heading}</h1>
        <p className={styles.sub}>{copy.body}</p>

        {isTest && (
          <span className={styles.testBadge}>Test mode — real ₹19 Cashfree charge</span>
        )}

        <div className={styles.card}>
          <div className={styles.planRow}>
            <span className={styles.planName}>{plan.name} plan</span>
            <span className={styles.price}>
              ₹{plan.amount}
              <span className={styles.priceSuffix}>/mo</span>
            </span>
          </div>

          <div className={styles.divider} />

          <ul className={styles.features}>
            {FEATURES.map((f) => (
              <li key={f} className={styles.feature}>
                <Check size={16} className={styles.featureIcon} />
                {f}
              </li>
            ))}
          </ul>

          <div className={styles.ctaWrap}>
            <SubscribeButton
              workspaceSlug={workspaceSlug}
              plan={isTest ? "test" : "growth"}
              label={`Subscribe — ₹${plan.amount}/month`}
            />
          </div>
        </div>

        <div className={styles.trust}>
          <ShieldCheck size={15} className={styles.trustIcon} />
          Payments secured by Cashfree
        </div>
        <p className={styles.footNote}>
          Your subscription renews every 30 days from your payment date. Cancel anytime.
        </p>
      </div>
    </main>
  )
}
