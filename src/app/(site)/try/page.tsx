import { getSampleCatalog } from "@/lib/db";
import { Wizard } from "@/components/Wizard";

export default async function TryPage() {
  const garments = await getSampleCatalog();
  return <Wizard garments={garments} />;
}
