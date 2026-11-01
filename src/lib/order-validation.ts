import { z } from "zod";
import { FILE_TYPES, MAX_FILES, MAX_FILE_BYTES } from "./order-limits";

function todayInPoland() {
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
    locale: z.enum(["pl", "en"]),
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
export class OrderError extends Error {
  constructor(public status: number) {
    super("Invalid order request");
  }
}

function fileExtension(bytes: Buffer, type: string) {
  if (
    type === "image/jpeg" &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255
  )
    return "jpg";
  if (
    type === "image/png" &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "png";
  if (
    type === "image/webp" &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  )
    return "webp";
  if (type === "application/pdf" && bytes.toString("ascii", 0, 5) === "%PDF-")
    return "pdf";
  return null;
}
export async function parseAttachments(data: FormData) {
  const values = data.getAll("files");
  if (
    values.length > MAX_FILES ||
    values.some((value) => typeof value === "string")
  )
    throw new OrderError(400);
  const files = values as File[];
  if (files.reduce((sum, file) => sum + file.size, 0) > MAX_FILE_BYTES)
    throw new OrderError(413);
  return Promise.all(
    files.map(async (file, index) => {
      if (!file.size || !FILE_TYPES.includes(file.type))
        throw new OrderError(400);
      const content = Buffer.from(await file.arrayBuffer());
      const extension = fileExtension(content, file.type);
      if (!extension) throw new OrderError(400);
      const stem =
        file.name
          .replace(/\.[^.]*$/, "")
          .replace(/[^\p{L}\p{N}_-]/gu, "_")
          .slice(0, 70) || "reference";
      return {
        filename: `${index + 1}-${stem}.${extension}`,
        content,
        contentType: file.type,
      };
    }),
  );
}
