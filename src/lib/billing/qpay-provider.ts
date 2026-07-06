// QPay billing provider — the default rail for the Mongolian market. This is the
// ONLY place the QPay API is called. Flow (QPay v2 merchant API):
//   1. POST /auth/token   (HTTP Basic client_id:client_secret) -> access_token
//   2. POST /invoice      -> { invoice_id, qr_text, qr_image, urls[] }
//   3. POST /payment/check -> confirm the invoice was actually paid
// Payment is verified by asking QPay directly (payment/check), never by trusting
// the callback payload.

import { appUrl } from "@/lib/urls";
import { getBillingInvoice, setBillingInvoiceStatus } from "@/lib/db";
import type {
  BillingEvent,
  BillingProvider,
  CheckoutParams,
  CheckoutResult,
  QpayQr,
} from "./provider";

const DEFAULT_BASE = "https://merchant.qpay.mn/v2";
function baseUrl(): string {
  return process.env.QPAY_BASE_URL ?? DEFAULT_BASE;
}

function creds() {
  return {
    clientId: process.env.QPAY_CLIENT_ID,
    clientSecret: process.env.QPAY_CLIENT_SECRET,
    invoiceCode: process.env.QPAY_INVOICE_CODE,
  };
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  const { clientId, clientSecret } = creds();
  if (!clientId || !clientSecret) {
    throw new Error("QPAY_CLIENT_ID / QPAY_CLIENT_SECRET are not set");
  }
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`${baseUrl()}/auth/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`QPay auth failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("QPay auth returned no access_token");
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return data.access_token;
}

type QpayInvoiceResponse = {
  invoice_id: string;
  qr_text: string;
  qr_image?: string;
  urls?: { name: string; description: string; link: string }[];
};

type QpayPaymentCheck = {
  count: number;
  paid_amount: number;
  rows?: { payment_id: string; payment_status: string }[];
};

export const qpayProvider: BillingProvider = {
  name: "qpay",

  isConfigured() {
    const { clientId, clientSecret, invoiceCode } = creds();
    return Boolean(clientId && clientSecret && invoiceCode);
  },

  async createCheckout({
    store,
    plan,
    reference,
  }: CheckoutParams): Promise<CheckoutResult> {
    const { invoiceCode } = creds();
    if (!invoiceCode) throw new Error("QPAY_INVOICE_CODE is not set");
    const amount = plan.priceMnt;
    if (!amount) throw new Error(`Plan ${plan.id} has no MNT price for QPay`);

    const token = await getToken();
    // Our ledger row id rides on the callback so we can reconcile without
    // trusting the payload; QPay appends its own payment info to this URL.
    const callbackUrl = `${appUrl()}/api/billing/webhook/qpay?invoice=${reference}`;

    const res = await fetch(`${baseUrl()}/invoice`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        invoice_code: invoiceCode,
        sender_invoice_no: reference,
        invoice_receiver_code: process.env.QPAY_INVOICE_RECEIVER_CODE ?? "terminal",
        invoice_description: `${store.name} — ${plan.name} plan`,
        amount,
        callback_url: callbackUrl,
      }),
    });
    if (!res.ok) {
      throw new Error(`QPay invoice failed (${res.status}): ${await res.text()}`);
    }
    const data = (await res.json()) as QpayInvoiceResponse;

    const qrImage = data.qr_image
      ? data.qr_image.startsWith("data:")
        ? data.qr_image
        : `data:image/png;base64,${data.qr_image}`
      : null;
    const qr: QpayQr = {
      invoiceId: data.invoice_id,
      qrText: data.qr_text,
      qrImage,
      deeplinks: (data.urls ?? []).map((u) => ({
        name: u.name,
        description: u.description,
        link: u.link,
      })),
    };
    return { kind: "qr", providerRef: data.invoice_id, qr };
  },

  async parseWebhook(req: Request): Promise<BillingEvent> {
    const reference = new URL(req.url).searchParams.get("invoice");
    if (!reference) return { type: "ignored" };
    return settleQpayInvoice(reference);
  },
};

/**
 * Ask QPay whether the invoice behind our ledger row is actually paid, mark the
 * row, and emit a normalized event. Reused by both the callback webhook and the
 * client status poll so payment settles even if the public callback URL isn't
 * reachable (e.g. local dev).
 */
export async function settleQpayInvoice(reference: string): Promise<BillingEvent> {
  const invoice = await getBillingInvoice(reference);
  if (!invoice || invoice.provider !== "qpay" || !invoice.providerRef) {
    return { type: "ignored" };
  }
  if (invoice.status === "paid") {
    return {
      type: "activated",
      provider: "qpay",
      storeId: invoice.storeId,
      planId: invoice.planId,
      reference,
      customerId: null,
      subscriptionId: invoice.providerRef,
    };
  }

  const token = await getToken();
  const res = await fetch(`${baseUrl()}/payment/check`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      object_type: "INVOICE",
      object_id: invoice.providerRef,
      offset: { page_number: 1, page_limit: 100 },
    }),
  });
  if (!res.ok) {
    throw new Error(`QPay payment check failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as QpayPaymentCheck;

  const amountDue = invoice.amount ?? 0;
  const paidEnough =
    amountDue > 0 && Number(data.paid_amount ?? 0) >= amountDue;
  const hasPaidRow = (data.rows ?? []).some(
    (r) => String(r.payment_status).toUpperCase() === "PAID"
  );
  if (!paidEnough && !hasPaidRow) return { type: "ignored" };

  await setBillingInvoiceStatus(reference, "paid");
  return {
    type: "activated",
    provider: "qpay",
    storeId: invoice.storeId,
    planId: invoice.planId,
    reference,
    customerId: null,
    subscriptionId: invoice.providerRef,
  };
}
