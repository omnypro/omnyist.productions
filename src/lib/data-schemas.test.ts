import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { parseJsonc } from "./jsonc-loader";

const root = path.resolve(import.meta.dir, "../..");

interface ProductsSchema {
  definitions: { person: { enum: string[] } };
  items: { properties: Record<string, unknown> };
}

function readJson<T = unknown>(relative: string): T {
  return JSON.parse(readFileSync(path.join(root, relative), "utf8")) as T;
}

function data(name: string): unknown {
  return parseJsonc(
    readFileSync(path.join(root, "src/data", `${name}.jsonc`), "utf8"),
    `${name}.jsonc`,
  );
}

function problems(name: string, value: unknown): string[] {
  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(
    readJson<object>(`src/data/schemas/${name}.schema.json`),
  );
  validate(value);
  return (validate.errors ?? []).map(
    (error) => `${error.instancePath || "/"} ${error.message}`,
  );
}

describe("the real data files", () => {
  test.each(["products", "people", "about"])(
    "%s.jsonc passes its schema",
    (name) => {
      expect(problems(name, data(name))).toEqual([]);
    },
  );
});

describe("products.schema.json", () => {
  const valid = { id: "perpetual", name: "Perpetual", author: ["bryan"] };

  test("accepts an entry with every optional field", () => {
    const full = {
      ...valid,
      tagline: "A short line.",
      description: "One sentence for search and social cards.",
      icon: "../assets/products/perpetual/icon.svg",
      accent: "#57e7cd",
      platforms: ["macOS", "iOS"],
      status: "beta",
      support: ["dave", "scott"],
      links: [{ label: "Download", href: "https://example.com/app" }],
    };
    expect(problems("products", [full])).toEqual([]);
  });

  test.each([
    ["an unknown field", { ...valid, taglin: "typo" }],
    ["an authored order", { ...valid, order: 3 }],
    ["an uppercase id", { ...valid, id: "Perpetual" }],
    ["an id with a space", { ...valid, id: "secret scene" }],
    ["a reserved id", { ...valid, id: "index" }],
    ["a missing name", { id: "x", author: ["bryan"] }],
    ["no author", { ...valid, author: [] }],
    ["an unknown author", { ...valid, author: ["nobody"] }],
    ["an unknown supporter", { ...valid, support: ["nobody"] }],
    ["a repeated author", { ...valid, author: ["bryan", "bryan"] }],
    ["a bad status", { ...valid, status: "shipped" }],
    ["a link without an href", { ...valid, links: [{ label: "Site" }] }],
    [
      "a link that is not a URL",
      { ...valid, links: [{ label: "Site", href: "not a url" }] },
    ],
    ["an icon outside the assets folder", { ...valid, icon: "/tmp/icon.svg" }],
  ])("rejects %s", (_name, entry) => {
    expect(problems("products", [entry]).length).toBeGreaterThan(0);
  });

  test("rejects a file that is not an array", () => {
    expect(problems("products", valid).length).toBeGreaterThan(0);
  });

  test("lists the same people as people.jsonc", () => {
    const schema = readJson<ProductsSchema>(
      "src/data/schemas/products.schema.json",
    );
    const ids = (data("people") as Array<{ id: string }>).map(
      (person) => person.id,
    );
    expect([...schema.definitions.person.enum].sort()).toEqual([...ids].sort());
  });

  const generated = path.join(root, ".astro/collections/products.schema.json");
  test.if(existsSync(generated))(
    "covers the same fields as the schema Astro generates from content.config.ts",
    () => {
      const authored = Object.keys(
        readJson<ProductsSchema>("src/data/schemas/products.schema.json").items
          .properties,
      ).sort();
      const fromAstro = Object.keys(
        readJson<{ properties: Record<string, unknown> }>(
          ".astro/collections/products.schema.json",
        ).properties,
      )
        .filter((key) => key !== "$schema" && key !== "order")
        .sort();
      expect(authored).toEqual(fromAstro);
    },
  );
});

describe("editor settings", () => {
  interface Mapping {
    fileMatch: string[];
    url: string;
  }

  const editors: Array<[string, string, (settings: unknown) => Mapping[]]> = [
    [
      "VS Code",
      ".vscode/settings.json",
      (settings) => (settings as { "json.schemas": Mapping[] })["json.schemas"],
    ],
    [
      "Zed",
      ".zed/settings.json",
      (settings) =>
        (
          settings as {
            lsp: {
              "json-language-server": {
                settings: { json: { schemas: Mapping[] } };
              };
            };
          }
        ).lsp["json-language-server"].settings.json.schemas,
    ],
  ];

  test.each(editors)(
    "%s maps all three data files to schema files that exist",
    (_editor, settingsPath, schemasOf) => {
      const mappings = schemasOf(
        parseJsonc(
          readFileSync(path.join(root, settingsPath), "utf8"),
          settingsPath,
        ),
      );
      expect(mappings.map((mapping) => mapping.fileMatch)).toEqual([
        [expect.stringContaining("src/data/products.jsonc")],
        [expect.stringContaining("src/data/people.jsonc")],
        [expect.stringContaining("src/data/about.jsonc")],
      ]);
      for (const mapping of mappings) {
        expect(existsSync(path.join(root, mapping.url))).toBe(true);
      }
    },
  );
});

describe("people.schema.json", () => {
  test.each([
    ["a missing name", { id: "bryan" }],
    ["an unknown field", { id: "bryan", name: "Bryan", nickname: "B" }],
    ["a url that is not a URL", { id: "bryan", name: "Bryan", url: "nope" }],
    ["an invalid id", { id: "Bryan", name: "Bryan" }],
  ])("rejects %s", (_name, entry) => {
    expect(problems("people", [entry]).length).toBeGreaterThan(0);
  });
});

describe("about.schema.json", () => {
  test.each([
    ["an empty body", { id: "home", body: [] }],
    ["a body that is a string", { id: "home", body: "text" }],
    ["a missing id", { body: ["text"] }],
    ["an unknown field", { id: "home", body: ["text"], title: "About" }],
  ])("rejects %s", (_name, entry) => {
    expect(problems("about", [entry]).length).toBeGreaterThan(0);
  });
});
