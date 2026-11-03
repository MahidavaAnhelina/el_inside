import type { CreateEmailOptions } from "resend";
import { dictionaries } from "./i18n";
import type { Order, parseAttachments } from "./order-validation";

export type Attachments = Awaited<ReturnType<typeof parseAttachments>>;
export type OrderDelivery = {
  destination: string;
  send(
    order: Order,
    attachments: Attachments,
    idempotencyKey: string,
  ): Promise<void>;
};
export type MailConfig = { from: string; to: string };
export type SendMail = (
  message: CreateEmailOptions,
  idempotencyKey: string,
) => Promise<{ error: unknown; data: { id: string } | null }>;

export function emailText(order: Order) {
  const t = dictionaries[order.locale];
  return [
    `El_Inside — ${order.requestId}`,
    `${t.deliveryLanguage}: ${order.locale}`,
    `${t.deliveryName}: ${order.name}`,
    `${t.deliveryEmail}: ${order.email}`,
    `${t.deliveryRequest}: ${order.kind === "catalog" ? t.kindCatalog : t.kindCustom}`,
    ...(order.kind === "catalog" && order.product
      ? [
          `${t.deliveryPiece}: ${t[order.product]}`,
          `${t.deliveryVersion}: ${order.version === "same" ? t.versionSame : t.versionChanges}`,
        ]
      : []),
    `${t.deliveryDate}: ${order.date || "—"}`,
    "",
    `${t.deliveryDetails}:`,
    order.details || "—",
    "",
    `${t.deliveryReferences}:`,
    order.links || "—",
    "",
    t.deliveryNotice,
  ].join("\n");
}

export function createMailDelivery(
  config: MailConfig,
  send: SendMail,
): OrderDelivery {
  return {
    destination: `mail:${config.from}:${config.to}`,
    async send(order, attachments, key) {
      const result = await send(
        {
          from: `El_Inside <${config.from}>`,
          to: [config.to],
          replyTo: order.email,
          subject: `El_Inside — ${dictionaries[order.locale].deliverySubject} (${order.requestId.slice(0, 8)})`,
          text: emailText(order),
          attachments,
        },
        key,
      );
      if (result.error || !result.data?.id) throw new Error("Delivery failed");
    },
  };
}

export function createTelegramDelivery(
  token: string,
  chatId: string,
  fetcher: typeof fetch = fetch,
): OrderDelivery {
  return {
    destination: `telegram:${chatId}`,
    async send(order, attachments) {
      const t = dictionaries[order.locale];
      const caption = [
        `El_Inside · ${order.requestId}`,
        order.name,
        order.email,
        order.kind === "catalog" && order.product
          ? t[order.product]
          : t.kindCustom,
        order.details.slice(0, 350),
        t.deliveryFull,
      ]
        .filter(Boolean)
        .join("\n");
      const form = new FormData();
      form.set("chat_id", chatId);
      const files = [
        {
          filename: "enquiry.txt",
          content: Buffer.from(emailText(order)),
          contentType: "text/plain",
        },
        ...attachments,
      ];
      files.forEach((file, index) =>
        form.set(
          `file${index}`,
          new Blob([new Uint8Array(file.content)], { type: file.contentType }),
          file.filename,
        ),
      );
      const method = files.length === 1 ? "sendDocument" : "sendMediaGroup";
      if (files.length === 1) {
        form.set("document", "attach://file0");
        form.set("caption", caption);
      } else {
        form.set(
          "media",
          JSON.stringify(
            files.map((_, index) => ({
              type: "document",
              media: `attach://file${index}`,
              ...(index === 0 ? { caption } : {}),
            })),
          ),
        );
      }
      // One API call per enquiry. Do not retry uncertain outcomes: Telegram has no idempotency key.
      const response = await fetcher(
        `https://api.telegram.org/bot${token}/${method}`,
        {
          method: "POST",
          body: form,
          signal: AbortSignal.timeout(12000),
          cache: "no-store",
        },
      );
      if (!response.ok) throw new Error("Delivery failed");
      const result = await response.json();
      const messages = Array.isArray(result.result)
        ? result.result
        : [result.result];
      if (
        result.ok !== true ||
        messages.length !== files.length ||
        messages.some(
          (message: { message_id?: unknown } | undefined) =>
            !Number.isInteger(message?.message_id),
        )
      )
        throw new Error("Delivery failed");
    },
  };
}
