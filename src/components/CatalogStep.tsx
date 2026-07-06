"use client";

import { useMemo, useState } from "react";
import {
  GARMENT_CATEGORIES,
  parseSizes,
  type Garment,
  type GarmentCategory,
  type Selection,
} from "@/lib/types";

type Props = {
  garments: Garment[];
  allowCustom: boolean;
  onSelect: (selection: Selection) => void;
  onBack: () => void;
};

const CATEGORIES: (GarmentCategory | "all")[] = ["all", ...GARMENT_CATEGORIES];

export function CatalogStep({
  garments,
  allowCustom,
  onSelect,
  onBack,
}: Props) {
  const [category, setCategory] = useState<GarmentCategory | "all">("all");
  const [size, setSize] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [customPhoto, setCustomPhoto] = useState<string | null>(null);

  // Every distinct size across the catalog, for the size filter dropdown.
  const sizeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const g of garments) {
      for (const s of parseSizes(g.sizes)) set.add(s);
    }
    return Array.from(set);
  }, [garments]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return garments.filter((g) => {
      if (category !== "all" && g.category !== category) return false;
      if (size !== "all" && !parseSizes(g.sizes).includes(size)) return false;
      if (
        q &&
        !g.name.toLowerCase().includes(q) &&
        !g.description.toLowerCase().includes(q) &&
        !g.category.toLowerCase().includes(q) &&
        !(g.brand ?? "").toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [garments, category, size, query]);

  function handleCustomPhoto(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCustomPhoto(reader.result as string);
    reader.readAsDataURL(file);
  }

  function submitCustom() {
    if (!customDesc.trim() && !customPhoto) return;
    onSelect({
      kind: "custom",
      name: customName.trim() || "My item",
      description: customDesc.trim() || "the uploaded garment",
      photo: customPhoto,
    });
  }

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Pick a look to try on
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Browse the catalog, or try on something from your own wardrobe.
        </p>
      </div>

      {/* Search + filter */}
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search items…"
          className="flex-1 rounded-full border border-zinc-300 bg-transparent px-4 py-2 text-sm outline-none focus:border-[var(--color-primary)] dark:border-zinc-700"
        />
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize ${
                category === c
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        {sizeOptions.length > 0 && (
          <select
            value={size}
            onChange={(e) => setSize(e.target.value)}
            aria-label="Filter by size"
            className="rounded-full border border-zinc-300 bg-transparent px-3 py-1.5 text-xs font-medium outline-none focus:border-[var(--color-primary)] dark:border-zinc-700"
          >
            <option value="all">All sizes</option>
            {sizeOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
      </div>

      {allowCustom && (
        <div className="w-full">
          {!showCustom ? (
            <button
              type="button"
              onClick={() => setShowCustom(true)}
              className="w-full rounded-xl border border-dashed border-zinc-300 py-3 text-sm font-medium text-zinc-600 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] dark:border-zinc-700 dark:text-zinc-300"
            >
              + Try on my own item
            </button>
          ) : (
            <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
              <input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Item name (optional)"
                className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] dark:border-zinc-700"
              />
              <textarea
                value={customDesc}
                onChange={(e) => setCustomDesc(e.target.value)}
                rows={2}
                placeholder="Describe it, e.g. a black leather biker jacket"
                className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] dark:border-zinc-700"
              />
              <label className="text-sm text-zinc-600 dark:text-zinc-400">
                Photo of the item (optional, improves accuracy)
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleCustomPhoto(e.target.files?.[0])}
                  className="mt-1 block text-sm"
                />
              </label>
              {customPhoto && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={customPhoto}
                  alt="Your item"
                  className="h-20 w-20 rounded-lg object-cover"
                />
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={submitCustom}
                  disabled={!customDesc.trim() && !customPhoto}
                  className="rounded-full bg-[var(--color-primary)] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
                >
                  Try it on
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustom(false)}
                  className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="py-6 text-sm text-zinc-500">No items match your search.</p>
      ) : (
        <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3">
          {filtered.map((garment) => (
            <button
              key={garment.id}
              type="button"
              onClick={() => onSelect({ kind: "catalog", garment })}
              className="group flex flex-col items-center gap-2 rounded-xl border border-zinc-200 p-3 text-left transition-shadow hover:shadow-md dark:border-zinc-800"
            >
              {garment.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={garment.photoUrl}
                  alt={garment.name}
                  className="h-28 w-full rounded-lg object-cover"
                />
              ) : (
                <span
                  className="h-28 w-full rounded-lg"
                  style={{ backgroundColor: garment.swatch }}
                  aria-hidden
                />
              )}
              <span className="w-full text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {garment.name}
              </span>
              <span className="flex w-full items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span className="capitalize">
                  {garment.brand ? garment.brand : garment.category}
                </span>
                {garment.price != null && (
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    ${garment.price.toFixed(0)}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onBack}
        className="text-sm text-zinc-500 underline-offset-2 hover:underline"
      >
        ← Use a different photo
      </button>
    </div>
  );
}
