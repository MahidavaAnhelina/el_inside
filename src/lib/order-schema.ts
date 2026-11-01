import { z } from "zod";
import { locales } from "./i18n";

export function todayInPoland() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
const links = z
  .string()
  .trim()
  .max(2000)
  .refine(
    (value) =>
      !value ||
      value
        .split(/\r?\n/)
        .filter(Boolean)
        .every((line) => {
          try {
            const url = new URL(line.trim());
            return (
              ["http:", "https:"].includes(url.protocol) &&
              !url.username &&
              !url.password
            );
          } catch {
            return false;
          }
        }),
  );
export const orderSchema = z
  .object({
    locale: z.enum(locales),
    kind: z.enum(["catalog", "custom"]),
    product: z.enum(["", "frog", "body", "sea", "giraffe"]),
    version: z.enum(["same", "changes"]),
    name: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .refine((value) => !/[\r\n\x00-\x1f]/.test(value)),
    email: z.email().max(200),
    details: z.string().trim().max(3000),
    links,
    date: z
      .union([z.literal(""), z.iso.date()])
      .refine((value) => !value || value >= todayInPoland()),
    requestId: z.uuid(),
    website: z.string().max(0),
  })
  .superRefine((order, context) => {
    if (order.kind === "catalog" && !order.product)
      context.addIssue({
        code: "custom",
        path: ["product"],
        message: "Choose a piece",
      });
    if (
      (order.kind === "custom" || order.version === "changes") &&
      !order.details
    )
      context.addIssue({
        code: "custom",
        path: ["details"],
        message: "Describe your idea or changes",
      });
  });
export type Order = z.infer<typeof orderSchema>;

export const orderFields = [
  "product",
  "details",
  "files",
  "links",
  "name",
  "email",
  "date",
] as const;
export type OrderField = (typeof orderFields)[number];
export type FieldErrors = Partial<Record<OrderField, string>>;
export function fieldErrorsFromIssues(
  issues: readonly { path: readonly PropertyKey[] }[],
): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (orderFields.some((name) => name === field))
      errors[field as OrderField] = "invalid";
  }
  return errors;
}
