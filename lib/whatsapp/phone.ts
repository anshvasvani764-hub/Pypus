/**
 * Normalizes a phone number to Meta's expected format: "91XXXXXXXXXX"
 * (no +, no spaces, no dashes).
 *
 * Members are stored in the DB as bare 10-digit Indian numbers (no "91"
 * prefix), so this also has to handle that case — not just "+91..." or
 * "91..." input.
 *
 * Shared by lib/whatsapp/client.ts (to build the actual API payload) and
 * lib/whatsapp/log.ts (to guess the country for cost-dashboard purposes).
 * Keeping this in one place means both always agree on what counts as an
 * Indian number — that agreement is exactly what broke before: the logger
 * used to check the raw, un-prefixed DB value instead of the normalized
 * one, so bare 10-digit numbers never matched "91" and were misfiled as
 * `OTHER`.
 */
export function normalizePhoneForWhatsApp(phone: string): string {
  let clean = phone.replace(/[\s\-()]/g, "");
  if (clean.startsWith("+")) {
    clean = clean.slice(1);
  } else if (!clean.startsWith("91")) {
    clean = "91" + clean;
  }
  return clean;
}
