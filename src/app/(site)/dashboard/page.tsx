import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getStoresByUser } from "@/lib/db";
import { createStoreAction } from "@/app/actions/stores";
import { PLANS } from "@/lib/plans";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const stores = await getStoresByUser(user.id);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your stores</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Signed in as {user.email}
        </p>
      </div>

      {stores.length === 0 ? (
        <p className="text-zinc-500">
          No stores yet — create your first one below.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {stores.map((store) => (
            <li key={store.id}>
              <Link
                href={`/dashboard/${store.id}`}
                className="flex items-center justify-between rounded-xl border border-zinc-200 px-5 py-4 transition-shadow hover:shadow-md dark:border-zinc-800"
              >
                <span>
                  <span className="font-medium">{store.name}</span>
                  <span className="ml-2 text-sm text-zinc-500">
                    /{store.slug}
                  </span>
                </span>
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium capitalize text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {PLANS[store.plan]?.name ?? store.plan}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <form
        action={createStoreAction}
        className="flex flex-col gap-3 rounded-xl border border-dashed border-zinc-300 p-5 dark:border-zinc-700"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">New store name</span>
          <input
            name="name"
            required
            placeholder="e.g. Acme Apparel"
            className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-[var(--color-primary)] dark:border-zinc-700"
          />
        </label>
        <button
          type="submit"
          className="self-start rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Create store
        </button>
      </form>
    </div>
  );
}
