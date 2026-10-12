import { describe, expect, test } from "bun:test";
import { resolveReferences } from "./products";

const context = { product: "koushi", field: "author", source: "people.jsonc" };

describe("resolveReferences", () => {
  test("returns the entries when every reference resolved", () => {
    const entries = [{ id: "dan" }, { id: "bryan" }];
    expect(
      resolveReferences(entries, [{ id: "dan" }, { id: "bryan" }], context),
    ).toEqual(entries);
  });

  test("accepts an empty list", () => {
    expect(resolveReferences([], [], context)).toEqual([]);
  });

  test("names the product, field and id when a reference did not resolve", () => {
    expect(() =>
      resolveReferences(
        [{ id: "dan" }, undefined],
        [{ id: "dan" }, { id: "nobody" }],
        context,
      ),
    ).toThrow('product "koushi": author "nobody" is not in people.jsonc');
  });
});
