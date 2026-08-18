import crypto from "crypto"

// Cashfree PG REST API — no SDK dependency needed, just fetch.
// Docs: https://docs.cashfree.com/reference/pg-new-apis-endpoint

const CASHFREE_ENV = process.env.CASHFREE_ENV === "PROD" ? "PROD" : "TEST"
const BASE_URL =
  CASHFREE_ENV === "PROD"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg"

const API_VERSION = "2023-08-01"

function getCreds() {
  const appId = process.env.CASHFREE_APP_ID
  const secretKey = process.env.CASHFREE_SECRET_KEY
  if (!appId || !secretKey) {
    throw new Error(
      "CASHFREE_APP_ID / CASHFREE_SECRET_KEY missing from environment"
    )
  }
  return { appId, secretKey }
}

interface CreateOrderInput {
  orderId: string
  amount: number
  customerId: string
  customerPhone: string
  customerEmail?: string
  returnUrl: string
  notifyUrl: string
}

interface CreateOrderResult {
  orderId: string
  paymentSessionId: string
}

export async function createCashfreeOrder(
  input: CreateOrderInput
): Promise<CreateOrderResult> {
  const { appId, secretKey } = getCreds()

  const res = await fetch(`${BASE_URL}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": appId,
      "x-client-secret": secretKey,
      "x-api-version": API_VERSION,
    },
    body: JSON.stringify({
      order_id: input.orderId,
      order_amount: input.amount,
      order_currency: "INR",
      customer_details: {
        customer_id: input.customerId,
        customer_phone: input.customerPhone,
        customer_email: input.customerEmail || undefined,
      },
      order_meta: {
        return_url: input.returnUrl,
        notify_url: input.notifyUrl,
      },
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    console.error("Cashfree create order failed:", data)
    throw new Error(data?.message || "Failed to create Cashfree order")
  }

  return {
    orderId: data.order_id,
    paymentSessionId: data.payment_session_id,
  }
}

export interface CashfreeOrderStatus {
  orderId: string
  orderStatus: string
  orderAmount: number
}

/**
 * Server-to-server confirmation. Never trust a webhook payload alone for
 * something that unlocks paid access — always re-fetch the order status
 * directly from Cashfree before marking a subscription active.
 */
export async function getCashfreeOrderStatus(
  orderId: string
): Promise<CashfreeOrderStatus> {
  const { appId, secretKey } = getCreds()

  const res = await fetch(`${BASE_URL}/orders/${encodeURIComponent(orderId)}`, {
    method: "GET",
    headers: {
      "x-client-id": appId,
      "x-client-secret": secretKey,
      "x-api-version": API_VERSION,
    },
  })

  const data = await res.json()

  if (!res.ok) {
    console.error("Cashfree get order status failed:", data)
    throw new Error(data?.message || "Failed to fetch Cashfree order status")
  }

  return {
    orderId: data.order_id,
    orderStatus: data.order_status,
    orderAmount: data.order_amount,
  }
}

/**
 * Verifies the `x-webhook-signature` header Cashfree sends with every
 * webhook POST. signature = base64(HMAC_SHA256(timestamp + rawBody, secretKey))
 */
export function verifyCashfreeWebhookSignature(
  rawBody: string,
  timestamp: string,
  signature: string
): boolean {
  const { secretKey } = getCreds()
  const expected = crypto
    .createHmac("sha256", secretKey)
    .update(timestamp + rawBody)
    .digest("base64")

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    )
  } catch {
    return false
  }
}
