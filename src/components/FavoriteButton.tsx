"use client";

import { useState } from "react";
import { HeartIcon } from "@/components/icons";

export function FavoriteButton({
  tryOnId,
  initial,
}: {
  tryOnId: string;
  initial: boolean;
}) {
  const [isFavorite, setIsFavorite] = useState(initial);
  const [pending, setPending] = useState(false);

  async function toggle() {
    const next = !isFavorite;
    setIsFavorite(next); // optimistic
    setPending(true);
    try {
      const res = await fetch(`/api/try-ons/${tryOnId}/favorite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setIsFavorite(!next); // revert on failure
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      className={`text-xl transition-transform hover:scale-110 disabled:opacity-50 ${
        isFavorite ? "text-red-500" : "text-zinc-400"
      }`}
      title={isFavorite ? "Favorited" : "Add to favorites"}
    >
      <HeartIcon filled={isFavorite} />
    </button>
  );
}
