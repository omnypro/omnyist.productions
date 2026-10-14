import { defineCollection, reference } from "astro:content";
import { z } from "astro/zod";
import { jsoncLoader } from "./lib/jsonc-loader";
import { slugProblem } from "./lib/slug";

const slug = z.string().superRefine((id, ctx) => {
  const problem = slugProblem(id);
  if (problem) ctx.addIssue({ code: "custom", message: problem });
});

const people = defineCollection({
  loader: jsoncLoader("src/data/people.jsonc"),
  schema: z.object({
    id: slug,
    name: z.string().min(1),
    url: z.url().optional(),
  }),
});

const products = defineCollection({
  loader: jsoncLoader("src/data/products.jsonc"),
  schema: ({ image }) =>
    z
      .object({
        id: slug,
        order: z.number(),
        name: z.string().min(1),
        author: z.array(reference("people")).min(1),
        tagline: z.string().optional(),
        description: z.string().optional(),
        kind: z.enum(["software", "website"]).default("software"),
        url: z.url().optional(),
        icon: image().optional(),
        wallpaper: image().optional(),
        accent: z.string().optional(),
        platforms: z.array(z.string()).optional(),
        status: z.enum(["released", "beta", "in-development"]).optional(),
        support: z.array(reference("people")).default([]),
        links: z
          .array(z.object({ label: z.string(), href: z.url() }))
          .default([]),
      })
      .superRefine((product, ctx) => {
        if (product.kind === "website" && !product.url) {
          ctx.addIssue({
            code: "custom",
            path: ["url"],
            message: "a website needs a url",
          });
        }
      }),
});

const about = defineCollection({
  loader: jsoncLoader("src/data/about.jsonc", { markdown: "body" }),
  schema: z.object({
    id: z.string(),
    body: z.array(z.string()).min(1),
  }),
});

export const collections = { people, products, about };
