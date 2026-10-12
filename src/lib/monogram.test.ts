import { describe, expect, test } from "bun:test";
import { monogram } from "./monogram";

describe("monogram", () => {
  test("takes the first letter of the name", () => {
    expect(monogram("Perpetual")).toBe("P");
  });

  test("keeps an emoji whole instead of splitting it", () => {
    expect(monogram("🎬 Secret Scene")).toBe("🎬");
  });

  test("keeps a multi-part emoji whole", () => {
    expect(monogram("👨‍👩‍👧 Family")).toBe("👨‍👩‍👧");
  });

  test("returns an empty string for an empty name", () => {
    expect(monogram("")).toBe("");
  });
});
