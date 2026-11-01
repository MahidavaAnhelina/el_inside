import { createHash } from "node:crypto";
import type { CreateEmailOptions } from "resend";
import { dictionaries } from "./i18n";
import { MAX_REQUEST_BYTES } from "./order-limits";
import {
  OrderError,
  orderSchema,
  parseAttachments,
  type Order,
} from "./order-validation";

export type MailConfig = { from: string; to: string };
export type SendMail = (
  message: CreateEmailOptions,
  idempotencyKey: string,
) => Promise<{ error: unknown; data: { id: string } | null }>;

async function readForm(request: Request) {
  const type = request.headers.get("content-type") || "";
  if (!type.startsWith("multipart/form-data;") || !request.body)
    throw new OrderError(400);
  if (Number(request.headers.get("content-length")) > MAX_REQUEST_BYTES)
    throw new OrderError(413);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw new OrderError(413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": type },
    }).formData();
  } catch {
    throw new OrderError(400);
  }
}

export function emailText(order: Order) {
  const t = dictionaries[order.locale];
  return [
    `El_Inside — ${order.requestId}`,
    `Language / Język: ${order.locale}`,
    `Name / Imię: ${order.name}`,
    `Email: ${order.email}`,
    `Request / Zapytanie: ${order.kind === "catalog" ? t.kindCatalog : t.kindCustom}`,
    ...(order.kind === "catalog" && order.product
      ? [
          `Piece / Praca: ${t[order.product]}`,
          `Version / Wersja: ${order.version === "same" ? t.versionSame : t.versionChanges}`,
        ]
      : []),
    `Preferred date / Preferowany termin: ${order.date || "—"}`,
    "",
    "Details / Szczegóły:",
    order.details || "—",
    "",
    "References / Inspiracje:",
    order.links || "—",
    "",
    "This is an enquiry, not a confirmed order. / To zapytanie, nie potwierdzone zamówienie.",
  ].join("\n");
}
const reply = (status: number, body: object) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function handleOrder(
  request: Request,
  config: MailConfig | null,
  send: SendMail,
) {
  const origin = request.headers.get("origin");
  // Next.js can normalize the internal request URL to localhost behind a proxy.
  const host = request.headers.get("host") || new URL(request.url).host;
  try {
    const source = new URL(origin || "");
    if (
      source.host !== host ||
      !["http:", "https:"].includes(source.protocol) ||
      source.origin !== origin
    )
      return reply(403, { error: "forbidden" });
  } catch {
    return reply(403, { error: "forbidden" });
  }
  try {
    const form = await readForm(request);
    const parsed = orderSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) throw new OrderError(400);
    const attachments = await parseAttachments(form);
    if (!config) return reply(503, { error: "unavailable" });
    const order = parsed.data;
    const message: CreateEmailOptions = {
      from: `El_Inside <${config.from}>`,
      to: [config.to],
      replyTo: order.email,
      subject: `El_Inside — ${{ pl: "nowe zapytanie", en: "new enquiry", ru: "новая заявка" }[order.locale]} (${order.requestId.slice(0, 8)})`,
      text: emailText(order),
      attachments,
    };
    // Bind retries to the exact message, including attachment bytes and destination.
    const digest = createHash("sha256")
      .update(JSON.stringify(message))
      .digest("hex");
    const result = await send(message, `order/${order.requestId}/${digest}`);
    if (result.error || !result.data?.id)
      return reply(502, { error: "send_failed" });
    return reply(200, { ok: true, requestId: order.requestId });
  } catch (error) {
    if (error instanceof OrderError)
      return reply(error.status, {
        error: error.status === 413 ? "too_large" : "invalid",
      });
    return reply(502, { error: "send_failed" });
  }
}
