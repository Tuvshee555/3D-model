import { notFound } from "next/navigation";
import { getStoreBySlug, getGarmentsByStore } from "@/lib/db";
import { Wizard } from "@/components/Wizard";

export const metadata = {
  title: "Virtual try-on",
};

export default async function WidgetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) notFound();

  const garments = await getGarmentsByStore(store.id);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <div className="border-b border-zinc-200 px-5 py-3 text-sm font-medium dark:border-zinc-800">
        {store.name} · <span className="text-zinc-500">virtual try-on</span>
      </div>
      {garments.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-zinc-500">
          This store hasn&apos;t added any items yet.
        </div>
      ) : (
        <Wizard garments={garments} compact allowCustom={false} />
      )}
    </div>
  );
}
