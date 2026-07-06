import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  getStoreById,
  getGarmentsByStore,
  countStoreTryOnsThisMonth,
} from "@/lib/db";
import { deleteGarmentAction } from "@/app/actions/stores";
import { GarmentForm } from "@/components/GarmentForm";
import { ImportPanel } from "@/components/ImportPanel";
import { EmbedSnippet } from "@/components/EmbedSnippet";
import { PLANS } from "@/lib/plans";

export default async function StorePage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const store = await getStoreById(storeId);
  if (!store || store.userId !== user.id) redirect("/dashboard");

  const garments = await getGarmentsByStore(storeId);
  const plan = PLANS[store.plan] ?? PLANS.free;
  const usedThisMonth = await countStoreTryOnsThisMonth(storeId);
  const usagePct = Math.min(
    100,
    Math.round((usedThisMonth / plan.tryOnsPerMonth) * 100)
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-zinc-500 underline-offset-2 hover:underline"
          >
            ← All stores
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {store.name}
          </h1>
          <p className="text-sm text-zinc-500">/{store.slug}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {plan.name} plan
          </span>
          <Link
            href="/pricing"
            className="text-sm text-[var(--color-primary)] underline-offset-2 hover:underline"
          >
            Manage plan
          </Link>
        </div>
      </div>

      <section className="flex flex-col gap-2 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium">Usage this month</span>
          <span className="text-zinc-500">
            {usedThisMonth.toLocaleString()} /{" "}
            {plan.tryOnsPerMonth.toLocaleString()} try-ons
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-[var(--color-primary)]"
            style={{ width: `${usagePct}%` }}
          />
        </div>
        {usedThisMonth >= plan.tryOnsPerMonth && (
          <p className="text-xs text-red-600">
            You&apos;ve hit this month&apos;s limit — upgrade to keep generating
            try-ons.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">
          Catalog{" "}
          <span className="text-sm font-normal text-zinc-500">
            ({garments.length} items)
          </span>
        </h2>

        {garments.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {garments.map((g) => (
              <div
                key={g.id}
                className="flex flex-col gap-2 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
              >
                {g.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={g.photoUrl}
                    alt={g.name}
                    className="h-28 w-full rounded-lg object-cover"
                  />
                ) : (
                  <span
                    className="h-28 w-full rounded-lg"
                    style={{ backgroundColor: g.swatch }}
                    aria-hidden
                  />
                )}
                <span className="text-sm font-medium">{g.name}</span>
                <span className="flex items-center justify-between text-xs text-zinc-500">
                  <span className="capitalize">{g.category}</span>
                  {g.price != null && (
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      ${g.price.toFixed(0)}
                    </span>
                  )}
                </span>
                <form action={deleteGarmentAction}>
                  <input type="hidden" name="storeId" value={storeId} />
                  <input type="hidden" name="garmentId" value={g.id} />
                  <button
                    type="submit"
                    className="text-xs text-red-600 underline-offset-2 hover:underline"
                  >
                    Remove
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        <GarmentForm storeId={storeId} />
        <ImportPanel storeId={storeId} />
      </section>

      <EmbedSnippet slug={store.slug} />
    </div>
  );
}
