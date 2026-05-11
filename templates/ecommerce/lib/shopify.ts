/**
 * Studio Zero — Shopify Storefront API client
 *
 * Uses the GraphQL Storefront API (read-only, public — never the Admin API
 * from client code). Cart mutations are server-only via Next.js Server Actions.
 */
const STOREFRONT_DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN;
const STOREFRONT_TOKEN = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN;
const API_VERSION = "2024-10";

if (!STOREFRONT_DOMAIN || !STOREFRONT_TOKEN) {
  throw new Error("Set NEXT_PUBLIC_SHOPIFY_DOMAIN and NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN");
}

const ENDPOINT = `https://${STOREFRONT_DOMAIN}/api/${API_VERSION}/graphql.json`;

export async function shopifyFetch<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": STOREFRONT_TOKEN!,
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 60 }, // 60s ISR by default — override per call
  });

  if (!res.ok) {
    throw new Error(`Shopify ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  if (json.errors) {
    throw new Error(`Shopify GraphQL: ${JSON.stringify(json.errors)}`);
  }
  return json.data as T;
}

export const PRODUCTS_QUERY = /* GraphQL */ `
  query Products($first: Int!) {
    products(first: $first) {
      edges {
        node {
          id
          handle
          title
          description
          featuredImage { url altText }
          priceRange {
            minVariantPrice { amount currencyCode }
          }
          variants(first: 1) { edges { node { id availableForSale } } }
        }
      }
    }
  }
`;
