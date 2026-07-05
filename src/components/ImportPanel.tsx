"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  importCsvAction,
  importShopifyAction,
  type ImportState,
} from "@/app/actions/stores";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="self-start rounded-full bg-[var(--color-primary)] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "Importing…" : label}
    </button>
  );
}

function Result({ state }: { state: ImportState }) {
  if (!state) return null;
  if (state.error) return <p className="text-sm text-red-600">{state.error}</p>;
  return <p className="text-sm text-green-600">{state.ok}</p>;
}

export function ImportPanel({ storeId }: { storeId: string }) {
  const [tab, setTab] = useState<"csv" | "shopify">("csv");
  const [csvState, csvAction] = useActionState<ImportState, FormData>(
    importCsvAction,
    null
  );
  const [shopifyState, shopifyAction] = useActionState<ImportState, FormData>(
    importShopifyAction,
    null
  );

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
      <div className="flex items-center gap-2">
        <h3 className="mr-auto font-medium">Bulk import</h3>
        <button
          type="button"
          onClick={() => setTab("csv")}
          className={`rounded-full px-3 py-1 text-xs font-medium ${tab === "csv" ? "bg-[var(--color-primary)] text-white" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"}`}
        >
          CSV
        </button>
        <button
          type="button"
          onClick={() => setTab("shopify")}
          className={`rounded-full px-3 py-1 text-xs font-medium ${tab === "shopify" ? "bg-[var(--color-primary)] text-white" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"}`}
        >
          Shopify
        </button>
      </div>

      {tab === "csv" ? (
        <form action={csvAction} className="flex flex-col gap-3">
          <input type="hidden" name="storeId" value={storeId} />
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Paste CSV with a header row. Columns:{" "}
            <code className="text-xs">name, description, category, photo_url, product_url</code>
          </p>
          <textarea
            name="csv"
            rows={5}
            placeholder={
              "name,description,category,photo_url,product_url\nRed Tee,a fitted red crew-neck t-shirt,top,https://...,https://..."
            }
            className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 font-mono text-xs outline-none focus:border-[var(--color-primary)] dark:border-zinc-700"
          />
          <Result state={csvState} />
          <Submit label="Import CSV" />
        </form>
      ) : (
        <form action={shopifyAction} className="flex flex-col gap-3">
          <input type="hidden" name="storeId" value={storeId} />
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Enter your Shopify store domain and an Admin API access token with{" "}
            <code className="text-xs">read_products</code> scope. The token is
            used once to import and is not stored.
          </p>
          <input
            name="domain"
            placeholder="your-store.myshopify.com"
            className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] dark:border-zinc-700"
          />
          <input
            name="token"
            type="password"
            placeholder="shpat_..."
            className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] dark:border-zinc-700"
          />
          <Result state={shopifyState} />
          <Submit label="Import from Shopify" />
        </form>
      )}
    </div>
  );
}
