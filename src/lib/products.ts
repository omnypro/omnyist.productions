import type { CollectionEntry } from "astro:content";

export type Product = CollectionEntry<"products">;
export type Person = CollectionEntry<"people">;

export interface ProductDesignProps {
  product: Product;
  authors: Person[];
  support: Person[];
}

export interface ReferenceContext {
  product: string;
  field: string;
  source: string;
}

export function resolveReferences<T>(
  entries: Array<T | undefined>,
  references: ReadonlyArray<{ id: string }>,
  context: ReferenceContext,
): T[] {
  return entries.map((entry, index) => {
    if (entry === undefined) {
      const id = references[index]?.id;
      throw new Error(
        `product "${context.product}": ${context.field} "${id}" is not in ${context.source}`,
      );
    }
    return entry;
  });
}

export type ProductKind = "software" | "website";

export function groupByKind<
  T extends { data: { kind: ProductKind; order: number } },
>(products: T[]): Record<ProductKind, T[]> {
  const sorted = [...products].sort((a, b) => a.data.order - b.data.order);
  return {
    software: sorted.filter((product) => product.data.kind === "software"),
    website: sorted.filter((product) => product.data.kind === "website"),
  };
}

/** The tab title shown in a website's browser bar. */
export function barTitle(data: { name: string; tagline?: string }): string {
  return data.tagline ? `${data.name}: ${data.tagline}` : data.name;
}

/** The address shown in a browser bar: a bare origin loses its trailing slash. */
export function barUrl(url: string): string {
  const parsed = new URL(url);
  const bare =
    parsed.pathname === "/" && parsed.search === "" && parsed.hash === "";
  return bare ? `${parsed.protocol}//${parsed.host}` : url;
}
