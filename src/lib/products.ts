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
