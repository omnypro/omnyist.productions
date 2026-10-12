import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { LoaderContext } from "astro/loaders";
import {
  JsoncError,
  joinParagraphs,
  jsoncLoader,
  parseJsonc,
  toEntries,
} from "./jsonc-loader";

describe("parseJsonc", () => {
  test("accepts comments and trailing commas", () => {
    const value = parseJsonc(
      '// note\n{ "a": 1, /* inline */ "b": [1, 2,], }',
      "x.jsonc",
    );
    expect(value).toEqual({ a: 1, b: [1, 2] });
  });

  test("reports file, line and column for a syntax error", () => {
    expect(() => parseJsonc('{\n  "a": ,\n}', "x.jsonc")).toThrow(
      /^x\.jsonc:2:\d+ /,
    );
  });

  test("throws a JsoncError", () => {
    expect(() => parseJsonc("{", "x.jsonc")).toThrow(JsoncError);
  });
});

describe("toEntries", () => {
  test("reads an array of objects with ids, keeping the id in the data", () => {
    expect(toEntries([{ id: "a", n: 1 }, { id: "b" }], "x.jsonc")).toEqual([
      { id: "a", data: { id: "a", n: 1 } },
      { id: "b", data: { id: "b" } },
    ]);
  });

  test("reads an object keyed by id, puts the id in the data, and ignores $schema", () => {
    expect(toEntries({ $schema: "./s.json", a: { n: 1 } }, "x.jsonc")).toEqual([
      { id: "a", data: { id: "a", n: 1 } },
    ]);
  });

  test("rejects an item without an id", () => {
    expect(() => toEntries([{ id: "a" }, { name: "b" }], "x.jsonc")).toThrow(
      'x.jsonc: item 1 is missing a string "id"',
    );
  });

  test("rejects a duplicate id", () => {
    expect(() => toEntries([{ id: "a" }, { id: "a" }], "x.jsonc")).toThrow(
      'x.jsonc: duplicate id "a"',
    );
  });

  test("rejects an authored order in the array shape", () => {
    expect(() => toEntries([{ id: "a", order: 5 }], "x.jsonc")).toThrow(
      'x.jsonc: entry "a" sets "order", which the loader assigns',
    );
  });

  test("rejects an authored order in the keyed shape", () => {
    expect(() => toEntries({ a: { order: 5 } }, "x.jsonc")).toThrow(
      'x.jsonc: entry "a" sets "order", which the loader assigns',
    );
  });

  test("rejects an integer-like key in the keyed shape", () => {
    expect(() => toEntries({ "2048": {} }, "x.jsonc")).toThrow(
      'x.jsonc: entry "2048" has an integer-like key, which JavaScript reorders; use the array form',
    );
  });

  test("rejects a top level that is neither an array nor an object", () => {
    expect(() => toEntries("nope", "x.jsonc")).toThrow(
      "x.jsonc: must contain an array or an object",
    );
  });
});

describe("joinParagraphs", () => {
  test("joins paragraphs with a blank line", () => {
    expect(joinParagraphs(["one", "two"], "body", "home")).toBe("one\n\ntwo");
  });

  test.each([[undefined], ["text"], [[]], [[1, 2]]])("rejects %j", (value) => {
    expect(() => joinParagraphs(value, "body", "home")).toThrow(
      'entry "home": "body" must be a non-empty array of strings',
    );
  });
});

describe("jsoncLoader", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "jsonc-loader-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  function fakeContext(failOn?: string) {
    const stored: Array<Record<string, unknown>> = [];
    const parsed: Array<Record<string, unknown>> = [];
    let cleared = 0;
    const context = {
      config: { root: pathToFileURL(dir + path.sep) },
      store: {
        clear: () => {
          cleared += 1;
        },
        set: (entry: Record<string, unknown>) => {
          stored.push(entry);
          return true;
        },
      },
      parseData: async (props: Record<string, unknown>) => {
        parsed.push(props);
        if (props.id === failOn) throw new Error(`invalid ${failOn}`);
        return props.data;
      },
      renderMarkdown: async (content: string) => ({
        html: `<md>${content}</md>`,
      }),
      logger: { info: () => {}, error: () => {} },
    } as unknown as LoaderContext;
    return { context, stored, parsed, cleared: () => cleared };
  }

  test("validates each entry with parseData and stores it", async () => {
    await writeFile(
      path.join(dir, "data.jsonc"),
      '[{ "id": "a", "name": "A" }, { "id": "b", "name": "B" },]',
    );
    const { context, stored, parsed, cleared } = fakeContext();

    await jsoncLoader("data.jsonc").load(context);

    expect(cleared()).toBe(1);
    expect(stored.map((entry) => entry.id)).toEqual(["a", "b"]);
    expect(stored[0]).toEqual({
      id: "a",
      data: { id: "a", name: "A", order: 0 },
      filePath: "data.jsonc",
    });
    expect(parsed[0]?.filePath).toBe(path.join(dir, "data.jsonc"));
  });

  test("passes each entry's position in the file to parseData as order", async () => {
    await writeFile(
      path.join(dir, "data.jsonc"),
      '[{ "id": "b" }, { "id": "a" }, { "id": "c" }]',
    );
    const { context, parsed } = fakeContext();

    await jsoncLoader("data.jsonc").load(context);

    expect(parsed.map((props) => props.id)).toEqual(["b", "a", "c"]);
    expect(
      parsed.map((props) => (props.data as { order: number }).order),
    ).toEqual([0, 1, 2]);
  });

  test("leaves the store untouched when an entry fails validation", async () => {
    await writeFile(
      path.join(dir, "data.jsonc"),
      '[{ "id": "a" }, { "id": "b" }, { "id": "c" }]',
    );
    const { context, stored, cleared } = fakeContext("b");

    let message: string | undefined;
    try {
      await jsoncLoader("data.jsonc").load(context);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toBe("invalid b");
    expect(cleared()).toBe(0);
    expect(stored).toEqual([]);
  });

  test("renders the markdown field into rendered", async () => {
    await writeFile(
      path.join(dir, "about.jsonc"),
      '[{ "id": "home", "body": ["one", "two"] }]',
    );
    const { context, stored } = fakeContext();

    await jsoncLoader("about.jsonc", { markdown: "body" }).load(context);

    expect(stored[0]?.rendered).toEqual({ html: "<md>one\n\ntwo</md>" });
  });

  async function failure(promise: Promise<unknown>): Promise<unknown> {
    return promise.then(
      () => undefined,
      (error: unknown) => error,
    );
  }

  test("throws when the file is missing", async () => {
    const { context } = fakeContext();
    const error = await failure(jsoncLoader("missing.jsonc").load(context));
    expect(error).toBeInstanceOf(JsoncError);
    expect((error as JsoncError).message).toBe("File not found: missing.jsonc");
  });

  test("throws on a syntax error instead of loading nothing", async () => {
    await writeFile(path.join(dir, "bad.jsonc"), '[{ "id": }]');
    const { context } = fakeContext();
    const error = await failure(jsoncLoader("bad.jsonc").load(context));
    expect(error).toBeInstanceOf(JsoncError);
    expect((error as JsoncError).message).toMatch(/^bad\.jsonc:1:\d+ /);
  });

  test("throws when the markdown field is not a non-empty array of strings", async () => {
    await writeFile(
      path.join(dir, "about.jsonc"),
      '[{ "id": "home", "body": "just a string" }]',
    );
    const { context } = fakeContext();
    const error = await failure(
      jsoncLoader("about.jsonc", { markdown: "body" }).load(context),
    );
    expect(error).toBeInstanceOf(JsoncError);
    expect((error as JsoncError).message).toBe(
      'entry "home": "body" must be a non-empty array of strings',
    );
  });
});
