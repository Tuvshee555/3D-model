import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 px-6 py-8 text-sm text-zinc-500 dark:border-zinc-800">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-3 sm:flex-row">
        <span>© {new Date().getFullYear()} Outfit Copilot</span>
        <nav className="flex gap-5">
          <Link href="/try" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            Try it
          </Link>
          <Link href="/pricing" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            Pricing
          </Link>
          <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
