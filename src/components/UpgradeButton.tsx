"use client";

import { useState } from "react";

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

  async function checkout() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, planId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Checkout failed");
      window.location.href = body.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={checkout}
        disabled={pending}
        className="w-full rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Redirecting…" : label}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
