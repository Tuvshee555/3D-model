// Fetches products from a Shopify store's Admin GraphQL API using a per-store
// Admin API access token (entered by the store owner; used transiently).

export type ShopifyProduct = {
  title: string;
  description: string;
  category: string;
  photoUrl: string | null;
  productUrl: string | null;
};

const API_VERSION = "2024-10";

const PRODUCTS_QUERY = `
  query Products($cursor: String) {
    products(first: 50, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        title
        description
        productType
        onlineStoreUrl
        featuredImage { url }
      }
    }
  }
`;

type ProductNode = {
  title: string;
  description: string;
  productType: string;
  onlineStoreUrl: string | null;
  featuredImage: { url: string } | null;
};

type ProductsResponse = {
  data?: {
    products?: {
      pageInfo: { hasNextPage: boolean; endCursor: string };
      nodes: ProductNode[];
    };
  };
  errors?: Array<{ message: string }>;
};

function mapCategory(productType: string): string {
  const t = productType.toLowerCase();
  if (t.includes("dress") || t.includes("gown")) return "dress";
  if (
    t.includes("coat") ||
    t.includes("jacket") ||
    t.includes("outer") ||
    t.includes("blazer") ||
    t.includes("parka")
  )
    return "outerwear";
  if (
    t.includes("pant") ||
    t.includes("trouser") ||
    t.includes("jean") ||
    t.includes("short") ||
    t.includes("skirt") ||
    t.includes("legging") ||
    t.includes("bottom")
  )
    return "bottom";
  if (
    t.includes("hat") ||
    t.includes("cap") ||
    t.includes("scarf") ||
    t.includes("bag") ||
    t.includes("belt") ||
    t.includes("glasses") ||
    t.includes("sunglass") ||
    t.includes("jewel") ||
    t.includes("necklace") ||
    t.includes("accessor")
  )
    return "accessory";
  return "top";
}

export async function fetchShopifyProducts(
  domain: string,
  accessToken: string
): Promise<ShopifyProduct[]> {
  const host = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const endpoint = `https://${host}/admin/api/${API_VERSION}/graphql.json`;

  const products: ShopifyProduct[] = [];
  let cursor: string | null = null;

  // Paginate through all products.
  for (let page = 0; page < 20; page++) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({
        query: PRODUCTS_QUERY,
        variables: { cursor },
      }),
    });

    if (!res.ok) {
      throw new Error(
        `Shopify API error ${res.status}. Check the domain and Admin API token.`
      );
    }

    const json = (await res.json()) as ProductsResponse;
    if (json.errors) {
      throw new Error(
        `Shopify GraphQL error: ${json.errors[0]?.message ?? "unknown"}`
      );
    }

    const data = json.data?.products;
    if (!data) break;

    for (const node of data.nodes) {
      products.push({
        title: node.title,
        description: node.description || node.title,
        category: mapCategory(node.productType ?? ""),
        photoUrl: node.featuredImage?.url ?? null,
        productUrl: node.onlineStoreUrl ?? null,
      });
    }

    if (!data.pageInfo?.hasNextPage) break;
    cursor = data.pageInfo.endCursor;
  }

  return products;
}
