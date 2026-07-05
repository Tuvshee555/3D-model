"use client";

import { useState, useSyncExternalStore } from "react";

const noop = () => () => {};

export function EmbedSnippet({ slug }: { slug: string }) {
  // Read the browser origin without setState-in-effect (SSR-safe).
  const origin = useSyncExternalStore(
    noop,
    () => window.location.origin,
    () => "https://your-domain.com"
  );
  const [copied, setCopied] = useState(false);

  const snippet = `<iframe
  src="${origin}/widget/${slug}"
  width="420"
  height="720"
  style="border:0;border-radius:16px;max-width:100%"
  title="Virtual try-on"
  allow="clipboard-write"
></iframe>`;

  async function copy() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Embed on your store</h3>
        <button
          type="button"
          onClick={copy}
          className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          {copied ? "Copied!" : "Copy snippet"}
        </button>
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Paste this on any product page. Shoppers try on this store&apos;s items
        without leaving your site.
      </p>
      <pre className="overflow-x-auto rounded-lg bg-zinc-100 p-4 text-xs leading-relaxed dark:bg-zinc-900">
        <code>{snippet}</code>
      </pre>
      <a
        href={`/widget/${slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-[var(--color-primary)] underline-offset-2 hover:underline"
      >
        Preview the widget →
      </a>
    </div>
  );
}
