"use client";

import { useRef, useState } from "react";

// Portrait crop frame (matches the tall try-on preview). Output is rendered at
// a higher multiple for quality. No external cropping library — just canvas.
const FRAME_W = 256;
const FRAME_H = 320;
const OUT_SCALE = 3;

type Props = {
  src: string;
  onCancel: () => void;
  onDone: (croppedDataUrl: string) => void;
};

export function PhotoCropper({ src, onCancel, onDone }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Scale needed for the image to fully cover the frame at zoom 1.
  const coverScale = nat ? Math.max(FRAME_W / nat.w, FRAME_H / nat.h) : 1;
  const dispW = nat ? nat.w * coverScale * zoom : 0;
  const dispH = nat ? nat.h * coverScale * zoom : 0;

  // Keep the image covering the frame — no empty gaps when panning/zooming.
  function clampFor(o: { x: number; y: number }, z: number) {
    if (!nat) return { x: 0, y: 0 };
    const dW = nat.w * coverScale * z;
    const dH = nat.h * coverScale * z;
    const maxX = Math.max(0, (dW - FRAME_W) / 2);
    const maxY = Math.max(0, (dH - FRAME_H) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, o.x)),
      y: Math.min(maxY, Math.max(-maxY, o.y)),
    };
  }

  function handlePointerDown(e: React.PointerEvent) {
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function handlePointerMove(e: React.PointerEvent) {
    if (!dragStart.current) return;
    setOffset(
      clampFor(
        { x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y },
        zoom
      )
    );
  }
  function handlePointerUp() {
    dragStart.current = null;
  }

  function handleZoom(z: number) {
    setZoom(z);
    setOffset((o) => clampFor(o, z));
  }

  function confirm() {
    if (!imgRef.current || !nat) return;
    const canvas = document.createElement("canvas");
    canvas.width = FRAME_W * OUT_SCALE;
    canvas.height = FRAME_H * OUT_SCALE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const s = coverScale * zoom;
    const imageLeft = (FRAME_W - dispW) / 2 + offset.x;
    const imageTop = (FRAME_H - dispH) / 2 + offset.y;
    // Source rectangle (in natural pixels) that maps onto the frame.
    const srcX = -imageLeft / s;
    const srcY = -imageTop / s;
    const srcW = FRAME_W / s;
    const srcH = FRAME_H / s;

    ctx.drawImage(
      imgRef.current,
      srcX,
      srcY,
      srcW,
      srcH,
      0,
      0,
      canvas.width,
      canvas.height
    );
    onDone(canvas.toDataURL("image/jpeg", 0.92));
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-zinc-500">
        Drag to reposition, zoom to frame yourself.
      </p>
      <div
        className="relative overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-900"
        style={{ width: FRAME_W, height: FRAME_H, touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt="Adjust your photo"
          draggable={false}
          onLoad={(e) =>
            setNat({
              w: e.currentTarget.naturalWidth,
              h: e.currentTarget.naturalHeight,
            })
          }
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: dispW || undefined,
            height: dispH || undefined,
            maxWidth: "none",
            transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
            cursor: "grab",
          }}
        />
      </div>

      <input
        type="range"
        min={1}
        max={3}
        step={0.01}
        value={zoom}
        onChange={(e) => handleZoom(Number(e.target.value))}
        aria-label="Zoom"
        className="w-56 accent-[var(--color-primary)]"
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={confirm}
          className="rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Use photo
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-zinc-300 px-6 py-2.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Choose another
        </button>
      </div>
    </div>
  );
}
