"use client"

import { useState } from "react"
import Script from "next/script"
import { Loader2, ArrowRight } from "lucide-react"
import styles from "./subscribe.module.css"

declare global {
  interface Window {
    Cashfree?: (config: { mode: "sandbox" | "production" }) => {
      checkout: (options: {
        paymentSessionId: string
        redirectTarget: "_self"
      }) => void
    }
  }
}

export function SubscribeButton({
  workspaceSlug,
  plan = "growth",
  label,
}: {
  workspaceSlug: string
  plan?: "growth" | "test"
  label: string
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sdkReady, setSdkReady] = useState(false)

  async function handleSubscribe() {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceSlug, plan }),
      })
      const data = await res.json()

      if (!res.ok || !data.paymentSessionId) {
        throw new Error(data.error || "Could not start checkout")
      }

      if (!window.Cashfree) {
        throw new Error("Payment SDK failed to load — please refresh and try again")
      }

      const mode =
        process.env.NEXT_PUBLIC_CASHFREE_ENV === "PROD" ? "production" : "sandbox"
      const cashfree = window.Cashfree({ mode })
      cashfree.checkout({
        paymentSessionId: data.paymentSessionId,
        redirectTarget: "_self",
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setLoading(false)
    }
  }

  return (
    <>
      <Script
        src="https://sdk.cashfree.com/js/v3/cashfree.js"
        onLoad={() => setSdkReady(true)}
      />
      <button
        type="button"
        onClick={handleSubscribe}
        disabled={loading || !sdkReady}
        aria-busy={loading}
        className={styles.cta}
      >
        {loading ? (
          <>
            <Loader2 className={styles.spin} size={18} />
            Opening checkout…
          </>
        ) : (
          <>
            {label}
            <ArrowRight size={18} />
          </>
        )}
      </button>
      {error && (
        <p role="alert" className={styles.errorText}>
          {error}
        </p>
      )}
    </>
  )
}
