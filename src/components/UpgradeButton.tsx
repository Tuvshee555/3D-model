"use client";

import { useState } from "react";

type Qr = {
  invoiceId: string;
  qrText: string;
  qrImage: string | null;
  deeplinks: { name: string; description: string; link: string }[];
};

export function UpgradeButton({
  storeId,
  planId,
  label,
}: {
  storeId: string;
  planId: string;
  label: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qr, setQr] = useState<Qr | null>(null);

  async function checkout() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, planId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Checkout failed");

      if (body.kind === "redirect") {
        window.location.assign(body.redirectUrl);
        return;
      }
      // QR provider (QPay): show the code and poll for payment.
      setQr(body.qr as Qr);
      setPending(false);
      pollStatus(body.reference as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setPending(false);
    }
  }

  async function pollStatus(reference: string) {
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const res = await fetch(
          `/api/billing/status?invoice=${encodeURIComponent(reference)}`
        );
        const body = await res.json();
        if (body.status === "paid") {
          window.location.assign(`/dashboard/${storeId}?upgraded=1`);
          return;
        }
      } catch {
        // keep polling
      }
    }
  }

  if (qr) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-zinc-200 p-4 text-center dark:border-zinc-800">
        <p className="text-sm font-medium">Scan to pay with QPay</p>
        {qr.qrImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr.qrImage} alt="QPay QR code" className="h-44 w-44" />
        ) : (
          <p className="break-all rounded bg-zinc-100 p-2 text-xs dark:bg-zinc-800">
            {qr.qrText}
          </p>
        )}
        {qr.deeplinks.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {qr.deeplinks.map((d) => (
              <a
                key={d.name}
                href={d.link}
                className="rounded-full border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                {d.name}
              </a>
            ))}
          </div>
        )}
        <p className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-[var(--color-primary)]" />
          Waiting for payment…
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={checkout}
        disabled={pending}
        className="w-full rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Starting…" : label}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
