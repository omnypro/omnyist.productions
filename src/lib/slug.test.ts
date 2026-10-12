import { describe, expect, test } from "bun:test";
import { slugProblem } from "./slug";

describe("slugProblem", () => {
  test.each(["perpetual", "secret-scene", "koushi", "a1", "2048"])(
    "accepts %s",
    (id) => {
      expect(slugProblem(id)).toBeNull();
    },
  );

  test.each(["Secret Scene", "Perpetual", "-a", "a-", "a--b", "a_b", ""])(
    "rejects %j",
    (id) => {
      expect(slugProblem(id)).toContain("lowercase");
    },
  );

  test.each(["index", "404"])("rejects the reserved id %s", (id) => {
    expect(slugProblem(id)).toContain("reserved");
  });
});
