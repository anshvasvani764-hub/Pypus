"use client"

import { useState } from "react"

export default function WhatsAppTestPage() {
  const [phone, setPhone] = useState("")
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle")
  const [message, setMessage] = useState("")

  async function handleSend() {
    if (!phone.trim()) {
      setStatus("error")
      setMessage("Number daalo pehle")
      return
    }

    setStatus("sending")
    setMessage("")

    try {
      const res = await fetch("/api/whatsapp-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()

      if (!res.ok) {
        setStatus("error")
        setMessage(data.error || "Kuch gadbad ho gayi")
        return
      }

      setStatus("sent")
      setMessage(`Sent to ${data.sentTo} (id: ${data.messageId})`)
    } catch (err) {
      setStatus("error")
      setMessage(err instanceof Error ? err.message : "Network error")
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "60px auto", padding: 24, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>WhatsApp Number Test</h1>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 20 }}>
        Sends Meta&apos;s pre-approved <code>hello_world</code> template — no template
        approval needed. Local test only.
      </p>

      <input
        type="tel"
        placeholder="e.g. 9876543210"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          fontSize: 15,
          border: "1px solid #ccc",
          borderRadius: 6,
          marginBottom: 12,
        }}
      />

      <button
        onClick={handleSend}
        disabled={status === "sending"}
        style={{
          width: "100%",
          padding: "10px 12px",
          fontSize: 15,
          fontWeight: 600,
          color: "#fff",
          background: status === "sending" ? "#94d3a2" : "#25D366",
          border: "none",
          borderRadius: 6,
          cursor: status === "sending" ? "not-allowed" : "pointer",
        }}
      >
        {status === "sending" ? "Sending..." : "Send hello_world"}
      </button>

      {message && (
        <p
          style={{
            marginTop: 16,
            fontSize: 13,
            color: status === "error" ? "#c0392b" : "#1e824c",
          }}
        >
          {message}
        </p>
      )}
    </div>
  )
}
