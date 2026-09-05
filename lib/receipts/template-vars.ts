import { formatReceiptShortDate } from "@/lib/utils/date";

/**
 * The 8 variables that fill the approved "payment_receipt" WhatsApp
 * template's {{1}}-{{8}} placeholders, in this exact order (confirmed
 * against the live template in WhatsApp Manager — do not reorder without
 * checking there first, Meta matches purely by position, not name):
 *
 *   Hi {{1}}
 *   Your payment was received successfully at {{2}}.
 *   Plan Amount: ₹{{3}}
 *   Amount Paid: ₹{{4}} through {{5}}
 *   Remaining Amount: ₹{{6}}
 *   Payment Date: {{7}}
 *   Valid Till: {{8}}
 *
 *   {{1}} member name, {{2}} workspace/gym name, {{3}} plan amount,
 *   {{4}} amount paid, {{5}} payment method, {{6}} remaining amount,
 *   {{7}} payment date, {{8}} valid till date
 *
 * Edited from the Receipt Agent's script modal and persisted on
 * receipts.whatsapp_template_vars (jsonb). When a receipt has saved vars,
 * those exact values go out on WhatsApp instead of the auto-computed
 * defaults from lib/agent/queries.ts.
 *
 * `paymentDate` and `validTillDate` are kept as plain ISO dates
 * (YYYY-MM-DD) or null here — they're only formatted for display/send at
 * the edges (buildReceipt* below), so they round-trip cleanly through a
 * <input type="date">.
 */
export interface ReceiptTemplateVars {
  name: string;
  workspaceName: string;
  planAmount: number;
  amountPaid: number;
  paymentMethod: string;
  remainingAmount: number;
  paymentDate: string;
  validTillDate: string | null;
}

/** Body params for sendWhatsAppTemplate's `bodyParams`, in the template's
 * {{1}}-{{8}} order. */
export function buildReceiptTemplateBodyParams(vars: ReceiptTemplateVars): string[] {
  return [
    vars.name,
    vars.workspaceName,
    vars.planAmount.toLocaleString("en-IN"),
    vars.amountPaid.toLocaleString("en-IN"),
    vars.paymentMethod,
    vars.remainingAmount.toLocaleString("en-IN"),
    formatReceiptShortDate(vars.paymentDate),
    vars.validTillDate ? formatReceiptShortDate(vars.validTillDate) : "—",
  ];
}

/** Best-effort preview of what the approved template renders as on
 * WhatsApp. The exact copy lives in Meta's template library — this just
 * mirrors it closely enough for the owner to sanity-check the variables
 * before sending, and updates live as the fields below are edited. */
export function buildReceiptPreviewText(vars: ReceiptTemplateVars): string {
  const planAmountStr = vars.planAmount.toLocaleString("en-IN");
  const amountPaidStr = vars.amountPaid.toLocaleString("en-IN");
  const remainingStr = vars.remainingAmount.toLocaleString("en-IN");
  const paymentDateStr = formatReceiptShortDate(vars.paymentDate);
  const validTill = vars.validTillDate ? formatReceiptShortDate(vars.validTillDate) : "—";
  return `Hi ${vars.name}\nYour payment was received successfully at ${vars.workspaceName}.\n\nPlan Amount: ₹${planAmountStr}\nAmount Paid: ₹${amountPaidStr} through ${vars.paymentMethod}\nRemaining Amount: ₹${remainingStr}\nPayment Date: ${paymentDateStr}\nValid Till: ${validTill}\n\nThank you!`;
}
