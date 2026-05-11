import Link from "next/link";
import Image from "next/image";
import { shopifyFetch, PRODUCTS_QUERY } from "@/lib/shopify";

interface ProductsResponse {
  products: {
    edges: {
      node: {
        id: string;
        handle: string;
        title: string;
        featuredImage: { url: string; altText: string | null } | null;
        priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
      };
    }[];
  };
}

export default async function HomePage() {
  const data = await shopifyFetch<ProductsResponse>(PRODUCTS_QUERY, { first: 12 });
  const products = data.products.edges.map((e) => e.node);

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Storefront</h1>
      <ul className="mt-8 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <li key={p.id}>
            <Link href={`/products/${p.handle}`} className="block group">
              {p.featuredImage && (
                <div className="aspect-square overflow-hidden rounded bg-zinc-100">
                  <Image
                    src={p.featuredImage.url}
                    alt={p.featuredImage.altText ?? p.title}
                    width={400}
                    height={400}
                    className="h-full w-full object-cover group-hover:scale-105 transition"
                  />
                </div>
              )}
              <h2 className="mt-3 font-medium">{p.title}</h2>
              <p className="text-sm text-zinc-600">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: p.priceRange.minVariantPrice.currencyCode,
                }).format(parseFloat(p.priceRange.minVariantPrice.amount))}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
