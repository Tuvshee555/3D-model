import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { CameraIcon, HeartIcon } from "@/components/icons";

// Bottom tab bar shown only on small screens.
export async function MobileTabBar() {
  const user = await getCurrentUser();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-zinc-200 bg-white/95 backdrop-blur sm:hidden dark:border-zinc-800 dark:bg-black/95">
      <Link
        href="/try"
        className="flex flex-1 flex-col items-center gap-1 py-2 text-xs text-zinc-600 dark:text-zinc-300"
      >
        <CameraIcon className="text-lg" />
        Try
      </Link>
      <Link
        href="/gallery"
        className="flex flex-1 flex-col items-center gap-1 py-2 text-xs text-zinc-600 dark:text-zinc-300"
      >
        <HeartIcon className="text-lg" />
        Gallery
      </Link>
      <Link
        href={user ? "/dashboard" : "/login"}
        className="flex flex-1 flex-col items-center gap-1 py-2 text-xs text-zinc-600 dark:text-zinc-300"
      >
        <span className="text-lg leading-none">☰</span>
        {user ? "Account" : "Sign in"}
      </Link>
    </nav>
  );
}
