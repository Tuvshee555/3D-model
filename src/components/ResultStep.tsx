"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Selection } from "@/lib/types";
import { FavoriteButton } from "@/components/FavoriteButton";
import { BagIcon, ShareIcon } from "@/components/icons";
import { track } from "@/lib/analytics";

type Props = {
  personImage: string;
  selection: Selection;
  consent: boolean;
  onTryAnother: () => void;
  onStartOver: () => void;
};

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; image: string; tryOnId: string; productUrl: string | null };

function selectionName(selection: Selection): string {
  return selection.kind === "catalog"
    ? selection.garment.name
    : selection.name;
}

function requestBody(
  personImage: string,
  selection: Selection,
  consent: boolean
) {
  const base =
    selection.kind === "catalog"
      ? { personImage, garmentId: selection.garment.id }
      : {
          personImage,
          customGarment: {
            description: selection.description,
            photo: selection.photo,
          },
        };
  return { ...base, consent };
}

export function ResultStep({
  personImage,
  selection,
  consent,
  onTryAnother,
  onStartOver,
}: Props) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [copied, setCopied] = useState(false);
  const name = selectionName(selection);

  useEffect(() => {
    let cancelled = false;
    track("try_on_started", { kind: selection.kind, item: name });

    fetch("/api/try-on", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody(personImage, selection, consent)),
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Generation failed");
        return body as {
          resultImage: string;
          id: string;
          productUrl: string | null;
        };
      })
      .then(({ resultImage, id, productUrl }) => {
        if (!cancelled) {
          track("try_on_completed", { item: name });
          setState({
            status: "done",
            image: resultImage,
            tryOnId: id,
            productUrl: productUrl ?? null,
          });
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setState({ status: "error", message: err.message });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personImage, selection]);

  async function handleShare() {
    if (state.status !== "done") return;
    track("share_click", { item: name });
    const shareData = {
      title: "My virtual try-on",
      text: `Check out how ${name} looks on me`,
      url: state.image,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // fall through to copy
      }
    }
    await navigator.clipboard.writeText(state.image);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          This is an AI-generated preview, not a guarantee of exact fit.
        </p>
      </div>

      <div className="flex h-96 w-full items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
        {state.status === "loading" && (
          <div className="flex flex-col items-center gap-3 text-zinc-500">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-[var(--color-primary)]" />
            <span className="text-sm">Rendering your look…</span>
          </div>
        )}
        {state.status === "error" && (
          <div className="flex flex-col items-center gap-2 px-6 text-red-600">
            <span className="text-sm">Couldn&apos;t generate a preview.</span>
            <span className="text-xs text-red-500">{state.message}</span>
          </div>
        )}
        {state.status === "done" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={state.image}
            alt={`Preview wearing ${name}`}
            className="h-full w-full rounded-2xl object-cover"
          />
        )}
      </div>

      {state.status === "done" && state.productUrl && (
        <a
          href={state.productUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("buy_click", { item: name })}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-zinc-900 hover:opacity-90"
        >
          <BagIcon /> View details / Buy
        </a>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        {state.status === "done" && (
          <FavoriteButton tryOnId={state.tryOnId} initial={false} />
        )}
        <button
          type="button"
          onClick={onTryAnother}
          className="rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Try another look
        </button>
        {state.status === "done" && (
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-2 rounded-full border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            <ShareIcon /> {copied ? "Link copied!" : "Share"}
          </button>
        )}
        <button
          type="button"
          onClick={onStartOver}
          className="rounded-full border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Start over
        </button>
      </div>

      {state.status === "done" && (
        <Link
          href="/gallery"
          className="text-sm text-zinc-500 underline-offset-2 hover:underline"
        >
          Saved — view your gallery →
        </Link>
      )}
    </div>
  );
}
