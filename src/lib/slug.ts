const RESERVED = new Set(["index", "404"]);
const PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function slugProblem(id: string): string | null {
  if (!PATTERN.test(id))
    return "use lowercase letters, digits and single hyphens";
  if (RESERVED.has(id)) return `"${id}" is reserved by a site route`;
  return null;
}
