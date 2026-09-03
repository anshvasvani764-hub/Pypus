import { NextRequest, NextResponse } from "next/server"
import { sendWhatsAppTemplate, formatPhoneForWhatsApp } from "@/lib/whatsapp/client"

/**
 * Local-only test endpoint: sends Meta's pre-approved "hello_world"
 * template to a given number. No custom template approval needed —
 * use this to confirm WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID
 * are wired correctly before your real template is approved.
 *
 * Remove this route (or gate it behind an env check) before deploying
 * to production — it's a test/debug endpoint only.
 */
export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json()

    if (!phone || typeof phone !== "string") {
      return NextResponse.json({ error: "phone is required" }, { status: 400 })
    }

    const result = await sendWhatsAppTemplate(
      phone,
      "hello_world",
      [],
      "en_US"
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      sentTo: formatPhoneForWhatsApp(phone),
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
