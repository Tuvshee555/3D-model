import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getStoreById, getStoresByUser } from "@/lib/db";
import { PLANS, PLAN_ORDER } from "@/lib/plans";
import { UpgradeButton } from "@/components/UpgradeButton";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const { store: storeParam } = await searchParams;
  const user = await getCurrentUser();

  // Which store is being upgraded? Prefer the ?store= param, else the user's first store.
  let activeStoreId: string | null = null;
  let activeStorePlan = "free";
  if (user) {
    if (storeParam) {
      const store = await getStoreById(storeParam);
      if (store && store.userId === user.id) {
        activeStoreId = store.id;
        activeStorePlan = store.plan;
      }
    }
    if (!activeStoreId) {
      const stores = await getStoresByUser(user.id);
      if (stores[0]) {
        activeStoreId = stores[0].id;
        activeStorePlan = stores[0].plan;
      }
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-10 px-6 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          Simple, per-store pricing
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Start free. Upgrade when your try-on volume grows.
        </p>
      </div>

      <div className="grid w-full gap-6 md:grid-cols-3">
        {PLAN_ORDER.map((planId) => {
          const plan = PLANS[planId];
          const isCurrent = user && activeStoreId && activeStorePlan === planId;
          return (
            <div
              key={plan.id}
              className={`flex flex-col gap-4 rounded-2xl border p-6 ${
                plan.id === "growth"
                  ? "border-[var(--color-primary)] shadow-lg"
                  : "border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <div>
                <h2 className="text-lg font-semibold">{plan.name}</h2>
                <p className="text-sm text-zinc-500">{plan.blurb}</p>
              </div>
              <div className="text-3xl font-bold">
                ${plan.priceUsd}
                <span className="text-base font-normal text-zinc-500">/mo</span>
              </div>
              <ul className="flex flex-col gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-[var(--color-primary)]">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                {isCurrent ? (
                  <span className="block rounded-full bg-zinc-100 px-5 py-2.5 text-center text-sm font-medium text-zinc-500 dark:bg-zinc-800">
                    Current plan
                  </span>
                ) : plan.priceUsd === 0 ? (
                  <Link
                    href={user ? "/dashboard" : "/signup"}
                    className="block rounded-full border border-zinc-300 px-5 py-2.5 text-center text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                  >
                    {user ? "Included" : "Get started"}
                  </Link>
                ) : user && activeStoreId ? (
                  <UpgradeButton
                    storeId={activeStoreId}
                    planId={plan.id}
                    label={`Upgrade to ${plan.name}`}
                  />
                ) : (
                  <Link
                    href="/signup"
                    className="block rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-center text-sm font-semibold text-white hover:opacity-90"
                  >
                    Get started
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {user && !activeStoreId && (
        <p className="text-sm text-zinc-500">
          <Link
            href="/dashboard"
            className="text-[var(--color-primary)] underline-offset-2 hover:underline"
          >
            Create a store
          </Link>{" "}
          to choose a paid plan.
        </p>
      )}
    </div>
  );
}
