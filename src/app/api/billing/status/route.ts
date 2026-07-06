import { NextRequest, NextResponse } from "next/server";
import { getBillingInvoice } from "@/lib/db";
import { applyBillingEvent } from "@/lib/billing";
import { settleQpayInvoice } from "@/lib/billing/qpay-provider";

export const runtime = "nodejs";

// Poll the status of a checkout (used by the QPay QR flow). For an unpaid QPay
// invoice it actively confirms with QPay — so payment settles even where the
// public callback URL isn't reachable (e.g. local dev). Best-effort.
export async function GET(request: NextRequest) {
  const reference = new URL(request.url).searchParams.get("invoice");
  if (!reference) {
    return NextResponse.json({ error: "Missing invoice" }, { status: 400 });
  }

  const invoice = await getBillingInvoice(reference);
  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (invoice.provider === "qpay" && invoice.status !== "paid") {
    try {
      const event = await settleQpayInvoice(reference);
      if (event.type === "activated") await applyBillingEvent(event);
    } catch {
      // Leave the status pending; the client will poll again.
    }
  }

  const fresh = await getBillingInvoice(reference);
  return NextResponse.json({ status: fresh?.status ?? invoice.status });
}
