import { cookies } from "next/headers";
import Link from "next/link";
import { getTryOnsBySession, getTryOnsByUser } from "@/lib/db";
import { getCurrentUser, ANON_SESSION_COOKIE } from "@/lib/auth";
import { FavoriteButton } from "@/components/FavoriteButton";
import { deleteMyTryOnsAction } from "@/app/actions/data";
import type { TryOnRecord } from "@/lib/types";

export default async function GalleryPage() {
  const user = await getCurrentUser();

  let tryOns: TryOnRecord[] = [];
  if (user) {
    tryOns = await getTryOnsByUser(user.id);
  } else {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(ANON_SESSION_COOKIE)?.value;
    tryOns = sessionId ? await getTryOnsBySession(sessionId) : [];
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-8 bg-zinc-50 px-6 py-12 dark:bg-black">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">My try-ons</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          {user
            ? "Saved to your account."
            : "Saved on this device only — log in to keep them."}
        </p>
      </div>

      {tryOns.length === 0 ? (
        <p className="text-zinc-500">
          No try-ons yet.{" "}
          <Link
            href="/try"
            className="text-[var(--color-primary)] underline-offset-2 hover:underline"
          >
            Start one
          </Link>
        </p>
      ) : (
        <div className="grid w-full max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3">
          {tryOns.map((tryOn) => (
            <div
              key={tryOn.id}
              className="flex flex-col gap-2 rounded-xl border border-zinc-200 p-2 dark:border-zinc-800"
            >
              <a
                href={tryOn.resultImageUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={tryOn.resultImageUrl}
                  alt={tryOn.garmentName}
                  className="h-40 w-full rounded-lg object-cover"
                />
              </a>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {tryOn.garmentName}
                </span>
                <FavoriteButton tryOnId={tryOn.id} initial={tryOn.isFavorite} />
              </div>
              <span className="text-xs text-zinc-500">
                {new Date(tryOn.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4">
        <Link
          href="/try"
          className="text-sm text-zinc-500 underline-offset-2 hover:underline"
        >
          ← New try-on
        </Link>
        {tryOns.length > 0 && (
          <form action={deleteMyTryOnsAction}>
            <button
              type="submit"
              className="text-sm text-red-600 underline-offset-2 hover:underline"
            >
              Delete all my try-ons
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
