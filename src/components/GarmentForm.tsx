"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createGarmentAction } from "@/app/actions/stores";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="self-start rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "Adding…" : "Add item"}
    </button>
  );
}

export function GarmentForm({ storeId }: { storeId: string }) {
  const [photo, setPhoto] = useState<string>("");
  const [preview, setPreview] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPhoto(result);
      setPreview(result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await createGarmentAction(formData);
        formRef.current?.reset();
        setPhoto("");
        setPreview(null);
      }}
      className="flex flex-col gap-4 rounded-xl border border-dashed border-zinc-300 p-5 dark:border-zinc-700"
    >
      <h3 className="font-medium">Add a catalog item</h3>
      <input type="hidden" name="storeId" value={storeId} />
      <input type="hidden" name="photo" value={photo} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Name</span>
          <input
            name="name"
            required
            placeholder="e.g. Striped Summer Tee"
            className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-[var(--color-primary)] dark:border-zinc-700"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Category</span>
          <select
            name="category"
            className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-[var(--color-primary)] dark:border-zinc-700"
          >
            <option value="top">Top</option>
            <option value="dress">Dress</option>
            <option value="outerwear">Outerwear</option>
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Description (used by the AI)</span>
        <textarea
          name="description"
          required
          rows={2}
          placeholder="e.g. a fitted red crew-neck cotton t-shirt with short sleeves"
          className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-[var(--color-primary)] dark:border-zinc-700"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Product URL (optional — the buy link)</span>
        <input
          name="productUrl"
          type="url"
          placeholder="https://yourstore.com/products/red-tee"
          className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-[var(--color-primary)] dark:border-zinc-700"
        />
      </label>

      <div className="grid items-end gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Swatch color</span>
          <input
            name="swatch"
            type="color"
            defaultValue="#3366ff"
            className="h-10 w-20 rounded border border-zinc-300 bg-transparent dark:border-zinc-700"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Product photo (optional)</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="text-sm"
          />
        </label>
      </div>

      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="Product preview"
          className="h-24 w-24 rounded-lg object-cover"
        />
      )}

      <Submit />
    </form>
  );
}
