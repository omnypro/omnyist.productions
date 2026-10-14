import { describe, expect, test } from "bun:test";
import { barTitle, barUrl, groupByKind, resolveReferences } from "./products";

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

describe("groupByKind", () => {
  const entry = (id: string, kind: "software" | "website", order: number) => ({
    id,
    data: { kind, order },
  });

  test("splits software from websites, each in file order", () => {
    const grouped = groupByKind([
      entry("fullodds", "website", 4),
      entry("brewprint", "software", 1),
      entry("perpetual", "software", 0),
      entry("docs", "website", 2),
    ]);
    expect(grouped.software.map((product) => product.id)).toEqual([
      "perpetual",
      "brewprint",
    ]);
    expect(grouped.website.map((product) => product.id)).toEqual([
      "docs",
      "fullodds",
    ]);
  });

  test("returns empty groups when a kind has no entries", () => {
    expect(groupByKind([entry("perpetual", "software", 0)]).website).toEqual(
      [],
    );
  });
});

describe("barTitle", () => {
  test("joins the name and tagline like a page title", () => {
    expect(
      barTitle({
        name: "Full Odds",
        tagline: "The Shiny Hunter's Field Guide",
      }),
    ).toBe("Full Odds: The Shiny Hunter's Field Guide");
  });

  test("is just the name without a tagline", () => {
    expect(barTitle({ name: "Full Odds" })).toBe("Full Odds");
  });
});

describe("barUrl", () => {
  test("drops the trailing slash of a bare origin", () => {
    expect(barUrl("https://fullodds.app/")).toBe("https://fullodds.app");
    expect(barUrl("https://fullodds.app")).toBe("https://fullodds.app");
  });

  test("keeps a path, query or hash as written", () => {
    expect(barUrl("https://example.com/guide/")).toBe(
      "https://example.com/guide/",
    );
    expect(barUrl("https://example.com/?a=1")).toBe("https://example.com/?a=1");
  });
});
