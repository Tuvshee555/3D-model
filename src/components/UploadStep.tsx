"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CameraIcon } from "@/components/icons";

type Props = {
  onContinue: (photoDataUrl: string, consent: boolean) => void;
};

export function UploadStep({ onContinue }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
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

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          See it on you first
        </h1>
        <p className="mt-2 max-w-sm text-zinc-600 dark:text-zinc-400">
          Upload a photo and see yourself in the look before you buy. Stand in
          good lighting, full body if you can.
        </p>
      </div>

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
            <span className="text-sm font-medium">Tap to upload a photo</span>
            <span className="text-xs text-zinc-400">JPG or PNG, under 8MB</span>
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

      <label className="flex max-w-xs items-start gap-2 text-left text-xs text-zinc-500">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-primary)]"
        />
        <span>
          I&apos;m 13+ and agree my photo may be used to generate my try-on. It
          stays private and is auto-deleted within 24 hours unless I save it. See
          our{" "}
          <Link href="/terms" className="underline underline-offset-2">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </span>
      </label>

      <button
        type="button"
        disabled={!preview || !consent}
        onClick={() => preview && consent && onContinue(preview, consent)}
        className="rounded-full bg-[var(--color-primary)] px-8 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40 enabled:hover:opacity-90"
      >
        Continue
      </button>
    </div>
  );
}
