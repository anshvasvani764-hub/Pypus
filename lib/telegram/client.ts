/**
 * Minimal Telegram Bot API client — used to notify the owner (Ansh) the
 * moment a payment is marked done in the app, since automatic WhatsApp
 * sending has been turned off (business number got banned). The owner
 * gets pinged on Telegram and sends the receipt to the member manually.
 *
 * Required env vars (server-only):
 *   TELEGRAM_BOT_TOKEN  - from @BotFather
 *   TELEGRAM_CHAT_ID    - the chat id to notify (yours, or a group's)
 *
 * Get these by:
 *   1. Message @BotFather on Telegram -> /newbot -> copy the token it gives you
 *   2. Message your new bot anything (e.g. "hi")
 *   3. Visit https://api.telegram.org/bot<TOKEN>/getUpdates and read the
 *      "chat":{"id": ...} value from the JSON response — that's your chat id
 */

export interface TelegramSendResult {
  success: boolean;
  error?: string;
}

export async function sendTelegramMessage(text: string): Promise<TelegramSendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn("Telegram notify skipped: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set");
    return { success: false, error: "Telegram env vars not set" };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      console.error("Telegram send failed:", data);
      return { success: false, error: data?.description || `Telegram API error (${res.status})` };
    }
    return { success: true };
  } catch (err) {
    console.error("Telegram send threw:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown network error" };
  }
}

/** Notification sent right after a payment is marked paid / receipt saved. */
export function notifyReceiptGenerated(args: {
  memberName: string;
  amount: number;
  workspaceName: string;
  paymentMethod: string;
  receiptNumber: string;
  memberPhone: string | null;
}): Promise<TelegramSendResult> {
  const amountStr = args.amount.toLocaleString("en-IN");
  const text =
    `🧾 <b>New payment marked done</b>\n\n` +
    `Gym: ${args.workspaceName}\n` +
    `Member: ${args.memberName}\n` +
    `Amount: ₹${amountStr} (${args.paymentMethod})\n` +
    `Receipt #: ${args.receiptNumber}\n` +
    `Phone: ${args.memberPhone || "—"}\n\n` +
    `Send the receipt on WhatsApp manually — auto-send is off.`;

  return sendTelegramMessage(text);
}
