"use client";

import { useRef, useState } from "react";
import { AVATARS } from "@/lib/avatars";
import { CameraIcon } from "@/components/icons";

type Props = {
  onContinue: (photoDataUrl: string) => void;
};

type Mode = "photo" | "avatar";

export function UploadStep({ onContinue }: Props) {
  const [mode, setMode] = useState<Mode>("photo");
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avatarPending, setAvatarPending] = useState<string | null>(null);
  const [bodyDetails, setBodyDetails] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (JPG or PNG).");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Please choose a photo under 8MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function pickAvatar(avatarId: string) {
    setError(null);
    setAvatarPending(avatarId);
    try {
      const res = await fetch("/api/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarId, extra: bodyDetails.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Couldn't create avatar");
      onContinue(body.image as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create avatar");
    } finally {
      setAvatarPending(null);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          See it on you first
        </h1>
        <p className="mt-2 max-w-sm text-zinc-600 dark:text-zinc-400">
          Feeling adventurous? Try a new look. Use your own photo, or start from
          an avatar if you&apos;d rather not upload one.
        </p>
      </div>

      <div className="flex rounded-full border border-zinc-200 p-1 text-sm dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setMode("photo")}
          className={`rounded-full px-4 py-1.5 font-medium ${
            mode === "photo"
              ? "bg-[var(--color-primary)] text-white"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          Upload photo
        </button>
        <button
          type="button"
          onClick={() => setMode("avatar")}
          className={`rounded-full px-4 py-1.5 font-medium ${
            mode === "avatar"
              ? "bg-[var(--color-primary)] text-white"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          Use an avatar
        </button>
      </div>

      {mode === "photo" ? (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-64 w-56 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 text-zinc-500 transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="Your uploaded photo"
                className="h-full w-full rounded-2xl object-cover"
              />
            ) : (
              <>
                <CameraIcon className="text-4xl" />
                <span className="text-sm font-medium">
                  Tap to upload a photo
                </span>
                <span className="text-xs text-zinc-400">
                  Stand in good lighting, full body
                </span>
              </>
            )}
          </button>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="button"
            disabled={!preview}
            onClick={() => preview && onContinue(preview)}
            className="rounded-full bg-[var(--color-primary)] px-8 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40 enabled:hover:opacity-90"
          >
            Continue
          </button>
        </>
      ) : (
        <>
          <input
            value={bodyDetails}
            onChange={(e) => setBodyDetails(e.target.value)}
            placeholder="Optional: height / build, e.g. tall, broad shoulders"
            className="w-64 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] dark:border-zinc-700"
          />
          <div className="grid grid-cols-3 gap-3">
            {AVATARS.map((a) => (
              <button
                key={a.id}
                type="button"
                disabled={avatarPending !== null}
                onClick={() => pickAvatar(a.id)}
                className="flex h-28 w-24 flex-col items-center justify-center gap-2 rounded-xl border border-zinc-200 text-zinc-600 transition-colors hover:border-[var(--color-primary)] disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-300"
              >
                {avatarPending === a.id ? (
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-[var(--color-primary)]" />
                ) : (
                  <span className="text-3xl">{a.emoji}</span>
                )}
                <span className="text-xs font-medium">{a.label}</span>
              </button>
            ))}
          </div>
          {avatarPending && (
            <p className="text-sm text-zinc-500">Creating your avatar…</p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </>
      )}

      <p className="max-w-xs text-xs text-zinc-400">
        Your photo is private, used only to generate your preview. You can delete
        your try-ons anytime.
      </p>
    </div>
  );
}
