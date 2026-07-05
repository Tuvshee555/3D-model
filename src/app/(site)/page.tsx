import Link from "next/link";

const STEPS = [
  {
    title: "Upload a photo",
    body: "Your shopper snaps or uploads a full-body photo — no app, no scan, no hardware.",
  },
  {
    title: "Pick a look",
    body: "They browse your catalog and tap any item to try it on instantly.",
  },
  {
    title: "See it on them",
    body: "AI renders a photorealistic preview in seconds, so they buy with confidence.",
  },
];

const AUDIENCE = [
  {
    tag: "For shoppers",
    title: "See it on you first",
    body: "No more guessing how something fits or looks. Try the whole catalog on your own photo before you spend a cent.",
    cta: { href: "/try", label: "Try the demo" },
  },
  {
    tag: "For stores",
    title: "Boost sales, cut returns",
    body: "Add a virtual fitting room to any product page with one embed snippet. More confidence at checkout, fewer returns after it.",
    cta: { href: "/signup", label: "Create your store" },
  },
];

export default function MarketingHome() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center gap-6 bg-gradient-to-b from-white to-zinc-50 px-6 py-24 text-center dark:from-black dark:to-zinc-950">
        <span className="rounded-full bg-[var(--color-primary)]/10 px-4 py-1 text-sm font-medium text-[var(--color-primary)]">
          AI virtual try-on
        </span>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Let shoppers try it on{" "}
          <span className="text-[var(--color-primary)]">before they buy</span>
        </h1>
        <p className="max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
          Outfit Copilot turns a single photo into a photorealistic preview of
          your customer wearing any item in your catalog — no 3D, no AR
          hardware, just fast AI.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/try"
            className="rounded-full bg-[var(--color-primary)] px-7 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            Try the live demo
          </Link>
          <Link
            href="/signup"
            className="rounded-full border border-zinc-300 px-7 py-3 text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Set up your store
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-4xl px-6 py-20">
        <h2 className="text-center text-2xl font-semibold tracking-tight">
          How it works
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-semibold text-white">
                {i + 1}
              </span>
              <h3 className="font-medium">{step.title}</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Audience split */}
      <section className="mx-auto grid w-full max-w-4xl gap-6 px-6 pb-20 md:grid-cols-2">
        {AUDIENCE.map((a) => (
          <div
            key={a.tag}
            className="flex flex-col gap-4 rounded-2xl border border-zinc-200 p-8 dark:border-zinc-800"
          >
            <span className="text-sm font-medium text-[var(--color-primary)]">
              {a.tag}
            </span>
            <h3 className="text-xl font-semibold">{a.title}</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{a.body}</p>
            <Link
              href={a.cta.href}
              className="mt-auto self-start rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              {a.cta.label}
            </Link>
          </div>
        ))}
      </section>

      {/* Footer CTA */}
      <section className="border-t border-zinc-200 bg-zinc-50 px-6 py-16 text-center dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-2xl font-semibold tracking-tight">
          Ready to reduce returns?
        </h2>
        <p className="mx-auto mt-2 max-w-md text-zinc-600 dark:text-zinc-400">
          Set up a store, add your catalog, and drop the try-on widget on your
          product pages today.
        </p>
        <Link
          href="/signup"
          className="mt-6 inline-block rounded-full bg-[var(--color-primary)] px-7 py-3 text-sm font-semibold text-white hover:opacity-90"
        >
          Get started free
        </Link>
      </section>
    </div>
  );
}
