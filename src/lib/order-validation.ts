import { FILE_TYPES, MAX_FILES, MAX_FILE_BYTES } from "./order-limits";
export { orderSchema, type Order } from "./order-schema";

export class OrderError extends Error {
  constructor(
    public status: number,
    public field?: "files",
  ) {
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
    throw new OrderError(400, "files");
  const files = values as File[];
  if (files.reduce((sum, file) => sum + file.size, 0) > MAX_FILE_BYTES)
    throw new OrderError(413, "files");
  return Promise.all(
    files.map(async (file, index) => {
      if (!file.size || !FILE_TYPES.includes(file.type))
        throw new OrderError(400, "files");
      const content = Buffer.from(await file.arrayBuffer());
      const extension = fileExtension(content, file.type);
      if (!extension) throw new OrderError(400, "files");
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
