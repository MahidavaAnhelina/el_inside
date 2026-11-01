import { fieldErrorsFromIssues } from "./order-schema";
import { createHash } from "node:crypto";
import type { OrderDelivery } from "./order-delivery";
import { ProtectionError, type OrderProtection } from "./order-protection";
import { MAX_REQUEST_BYTES } from "./order-limits";
import { OrderError, orderSchema, parseAttachments } from "./order-validation";

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

const reply = (status: number, body: object, retryAfter?: number) =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}),
    },
  });
export async function handleOrder(
  request: Request,
  delivery: OrderDelivery | null,
  protection: OrderProtection | null,
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
  let dispatchStarted = false;
  try {
    if (!delivery || !protection) return reply(503, { error: "unavailable" });
    await protection.checkTraffic(request);
    const form = await readForm(request);
    const parsed = orderSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success)
      return reply(400, {
        error: "invalid",
        fields: fieldErrorsFromIssues(parsed.error.issues),
      });
    await protection.verify(form.get("cf-turnstile-response"));
    const attachments = await parseAttachments(form);
    const order = parsed.data;
    const { requestId, ...content } = order;
    // A fresh client UUID must not bypass duplicate detection for unchanged content.
    const digest = createHash("sha256")
      .update(
        JSON.stringify({
          destination: delivery.destination,
          content,
          attachments,
        }),
      )
      .digest("hex");
    const reservation = await protection.reserve(digest, requestId);
    if (reservation.sent)
      return reply(200, { ok: true, requestId: reservation.requestId });
    dispatchStarted = true;
    await delivery.send(order, attachments, `order/${digest}`);
    await protection.complete(digest, requestId);
    return reply(200, { ok: true, requestId });
  } catch (error) {
    if (dispatchStarted) return reply(409, { error: "delivery_uncertain" });
    if (error instanceof ProtectionError)
      return reply(
        error.status,
        {
          error: error.code,
          ...(error.requestId ? { requestId: error.requestId } : {}),
        },
        error.retryAfter,
      );
    if (error instanceof OrderError)
      return reply(error.status, {
        error: error.status === 413 ? "too_large" : "invalid",
        ...(error.field ? { fields: { [error.field]: "invalid" } } : {}),
      });
    return reply(503, { error: "unavailable" });
  }
}
