import { Catalog } from "../components/catalog";
import { loadPublicCatalog } from "../data/public-catalog-server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const publicData = await loadPublicCatalog();
  return <Catalog publicData={publicData} />;
}
