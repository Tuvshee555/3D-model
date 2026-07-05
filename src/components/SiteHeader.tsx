import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-black">
      <Link href="/" className="font-semibold tracking-tight">
        Outfit <span className="text-[var(--color-primary)]">Copilot</span>
      </Link>

      <nav className="flex items-center gap-5 text-sm">
        <Link
          href="/try"
          className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Try it
        </Link>
        <Link
          href="/pricing"
          className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Pricing
        </Link>
        {user ? (
          <>
            <Link
              href="/dashboard"
              className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Dashboard
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Log out
              </button>
            </form>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-[var(--color-primary)] px-4 py-1.5 font-medium text-white hover:opacity-90"
            >
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
