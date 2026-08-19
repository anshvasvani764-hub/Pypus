/**
 * Meta WhatsApp Cloud API client.
 *
 * Required env vars (server-only, never expose to client):
 *   WHATSAPP_ACCESS_TOKEN       - permanent or temporary token
 *   WHATSAPP_PHONE_NUMBER_ID    - the "from" number's Phone Number ID
 *
 * Note on free-form text vs templates:
 *   Meta only allows free-form text messages inside the 24-hour "customer
 *   service window" (i.e. the member messaged us in the last 24h). Fee
 *   reminders / receipts we initiate are business-initiated, so once the
 *   test phase is over these should switch to an approved message template
 *   (sendWhatsAppTemplate below). Until a template is approved, this will
 *   only succeed for members who've messaged the gym's WhatsApp number
 *   recently, or for verified test recipient numbers.
 */

const WHATSAPP_API_VERSION = "v21.0";

function apiUrl(): string {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!phoneNumberId) {
    throw new Error("WHATSAPP_PHONE_NUMBER_ID env var is not set");
  }
  return `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`;
}

/** Normalizes an Indian phone number to Meta's expected format: "91XXXXXXXXXX" (no +, no spaces). */
export function formatPhoneForWhatsApp(phone: string): string {
  let clean = phone.replace(/[\s\-()]/g, "");
  if (clean.startsWith("+")) {
    clean = clean.slice(1);
  } else if (!clean.startsWith("91")) {
    clean = "91" + clean;
  }
  return clean;
}

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

async function callWhatsAppApi(body: Record<string, unknown>): Promise<WhatsAppSendResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) {
    return { success: false, error: "WHATSAPP_ACCESS_TOKEN env var is not set" };
  }

  try {
    const res = await fetch(apiUrl(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      const message = data?.error?.message || `WhatsApp API error (${res.status})`;
      console.error("WhatsApp send failed:", data?.error ?? data);
      return { success: false, error: message };
    }

    return { success: true, messageId: data?.messages?.[0]?.id };
  } catch (err) {
    console.error("WhatsApp send threw:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown network error" };
  }
}

/**
 * Sends a free-form text message. Only works within the 24h customer
 * service window, or to numbers added as "test recipients" in Meta's
 * API Setup tab while the app hasn't been through Advanced Access review.
 */
export async function sendWhatsAppText(to: string, message: string): Promise<WhatsAppSendResult> {
  return callWhatsAppApi({
    messaging_product: "whatsapp",
    to: formatPhoneForWhatsApp(to),
    type: "text",
    text: { body: message },
  });
}

/**
 * Sends an approved message template. Use this for business-initiated
 * messages (fee reminders, receipts) once you're past the test phase -
 * these work regardless of the 24h window.
 *
 * `bodyParams` are the {{1}}, {{2}}... placeholder values for the template
 * body, in order, as plain strings.
 *
 * `headerImageLink` — pass a public HTTPS image URL when the template's
 * header is set to Image (e.g. the receipt photo). Meta fetches the image
 * from this URL at send time and delivers it as a real photo in the chat.
 * Omit for templates with no media header.
 */
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  bodyParams: string[] = [],
  languageCode = "en",
  headerImageLink?: string
): Promise<WhatsAppSendResult> {
  const components: Record<string, unknown>[] = [];

  if (headerImageLink) {
    components.push({
      type: "header",
      parameters: [{ type: "image", image: { link: headerImageLink } }],
    });
  }

  if (bodyParams.length > 0) {
    components.push({
      type: "body",
      parameters: bodyParams.map((text) => ({ type: "text", text })),
    });
  }

  return callWhatsAppApi({
    messaging_product: "whatsapp",
    to: formatPhoneForWhatsApp(to),
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components.length > 0 ? { components } : {}),
    },
  });
}
