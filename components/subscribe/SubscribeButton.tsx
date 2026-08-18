"use client"

import { useState } from "react"
import Script from "next/script"

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

export function SubscribeButton({ workspaceSlug }: { workspaceSlug: string }) {
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
        body: JSON.stringify({ workspaceSlug }),
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
        className="min-h-11 w-full rounded-lg bg-[#10B981] px-6 py-3 text-base font-semibold text-white transition-colors duration-200 hover:bg-[#059669] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#10B981] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Opening checkout…" : "Subscribe — ₹999/month"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-400">
          {error}
        </p>
      )}
    </>
  )
}
