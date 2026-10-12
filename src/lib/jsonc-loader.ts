import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Loader, LoaderContext } from "astro/loaders";
import { parse, printParseErrorCode, type ParseError } from "jsonc-parser";

export class JsoncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JsoncError";
  }
}

export interface RawEntry {
  id: string;
  data: Record<string, unknown>;
}

export interface JsoncLoaderOptions {
  /** A field authored as an array of markdown paragraphs, rendered into the entry's `rendered`. */
  markdown?: string;
}

export function parseJsonc(text: string, fileName: string): unknown {
  const errors: ParseError[] = [];
  const value = parse(text, errors, { allowTrailingComma: true });
  const [first] = errors;
  if (first) {
    const before = text.slice(0, first.offset);
    const line = before.split("\n").length;
    const column = first.offset - before.lastIndexOf("\n");
    throw new JsoncError(
      `${fileName}:${line}:${column} ${printParseErrorCode(first.error)}`,
    );
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const INTEGER_LIKE = /^(0|[1-9]\d*)$/;

function rejectAuthoredOrder(
  fileName: string,
  id: string,
  item: Record<string, unknown>,
): void {
  if ("order" in item) {
    throw new JsoncError(
      `${fileName}: entry "${id}" sets "order", which the loader assigns`,
    );
  }
}

export function toEntries(value: unknown, fileName: string): RawEntry[] {
  if (Array.isArray(value)) {
    const seen = new Set<string>();
    return value.map((item, index) => {
      if (!isRecord(item)) {
        throw new JsoncError(`${fileName}: item ${index} must be an object`);
      }
      const id = item.id;
      if (typeof id !== "string" || id === "") {
        throw new JsoncError(
          `${fileName}: item ${index} is missing a string "id"`,
        );
      }
      if (seen.has(id)) {
        throw new JsoncError(`${fileName}: duplicate id "${id}"`);
      }
      rejectAuthoredOrder(fileName, id, item);
      seen.add(id);
      return { id, data: item };
    });
  }
  if (isRecord(value)) {
    return Object.entries(value)
      .filter(([key]) => key !== "$schema")
      .map(([id, item]) => {
        if (INTEGER_LIKE.test(id)) {
          throw new JsoncError(
            `${fileName}: entry "${id}" has an integer-like key, which JavaScript reorders; use the array form`,
          );
        }
        if (!isRecord(item)) {
          throw new JsoncError(`${fileName}: entry "${id}" must be an object`);
        }
        rejectAuthoredOrder(fileName, id, item);
        return { id, data: { id, ...item } };
      });
  }
  throw new JsoncError(`${fileName}: must contain an array or an object`);
}

export function joinParagraphs(
  value: unknown,
  field: string,
  entryId: string,
): string {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    !value.every((item) => typeof item === "string")
  ) {
    throw new JsoncError(
      `entry "${entryId}": "${field}" must be a non-empty array of strings`,
    );
  }
  return value.join("\n\n");
}

export function jsoncLoader(
  fileName: string,
  options: JsoncLoaderOptions = {},
): Loader {
  async function sync(context: LoaderContext, filePath: string): Promise<void> {
    const entries = toEntries(
      parseJsonc(await readFile(filePath, "utf-8"), fileName),
      fileName,
    );
    const relativePath = path
      .relative(fileURLToPath(context.config.root), filePath)
      .split(path.sep)
      .join("/");

    const prepared = [];
    for (const [order, { id, data }] of entries.entries()) {
      const parsed = await context.parseData({
        id,
        data: { ...data, order },
        filePath,
      });
      const field = options.markdown;
      const rendered = field
        ? await context.renderMarkdown(joinParagraphs(data[field], field, id))
        : undefined;
      prepared.push({ id, data: parsed, rendered });
    }

    context.store.clear();
    for (const { id, data, rendered } of prepared) {
      context.store.set({
        id,
        data,
        filePath: relativePath,
        ...(rendered ? { rendered } : {}),
      });
    }
  }

  return {
    name: "jsonc-loader",
    async load(context) {
      const url = new URL(fileName, context.config.root);
      if (!existsSync(url)) {
        throw new JsoncError(`File not found: ${fileName}`);
      }
      const filePath = fileURLToPath(url);
      await sync(context, filePath);

      context.watcher?.add(filePath);
      context.watcher?.on("change", async (changed) => {
        if (changed !== filePath) return;
        context.logger.info(`Reloading data from ${fileName}`);
        try {
          await sync(context, filePath);
        } catch (error) {
          context.logger.error(
            error instanceof Error ? error.message : String(error),
          );
        }
      });
    },
  };
}
