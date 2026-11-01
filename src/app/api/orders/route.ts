import { Resend } from "resend";
import { z } from "zod";
import { handleOrder } from "@/lib/order-service";
import {
  createMailDelivery,
  createTelegramDelivery,
} from "@/lib/order-delivery";
import { createOrderProtection } from "@/lib/order-protection";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  const config = z
    .object({
      enabled: z.literal("true"),
      redisUrl: z.url().startsWith("https://"),
      redisToken: z.string().min(1),
      secret: z.string().min(1),
      siteKey: z.string().min(1),
      siteUrl: z.url(),
      namespace: z.string().regex(/^[a-zA-Z0-9_-]{1,60}$/),
    })
    .safeParse({
      enabled: process.env.ORDERS_ENABLED,
      redisUrl: process.env.UPSTASH_REDIS_REST_URL,
      redisToken: process.env.UPSTASH_REDIS_REST_TOKEN,
      secret: process.env.TURNSTILE_SECRET_KEY,
      siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
      siteUrl: process.env.SITE_URL,
      namespace:
        process.env.ORDER_LIMIT_NAMESPACE || process.env.VERCEL_ENV || "local",
    });
  const vercel = process.env.VERCEL === "1";
  // Cloudflare's public test keys must never enable sending on hosted deployments.
  if (
    !config.success ||
    (vercel &&
      (/^[123]x0{10}/.test(config.data.secret) ||
        /^[123]x0{10}/.test(config.data.siteKey)))
  )
    return handleOrder(request, null, null);

  let delivery = null;
  if ((process.env.ORDER_DELIVERY || "telegram") === "telegram") {
    const telegram = z
      .object({
        token: z.string().regex(/^\d+:[A-Za-z0-9_-]+$/),
        chatId: z.string().regex(/^-?\d+$/),
      })
      .safeParse({
        token: process.env.TELEGRAM_BOT_TOKEN,
        chatId: process.env.TELEGRAM_CHAT_ID,
      });
    if (telegram.success)
      delivery = createTelegramDelivery(
        telegram.data.token,
        telegram.data.chatId,
      );
  } else if (process.env.ORDER_DELIVERY === "resend") {
    const mail = z
      .object({ key: z.string().min(1), from: z.email(), to: z.email() })
      .safeParse({
        key: process.env.RESEND_API_KEY,
        from: process.env.RESEND_FROM_EMAIL,
        to: process.env.ORDER_TO_EMAIL,
      });
    if (mail.success) {
      const resend = new Resend(mail.data.key);
      delivery = createMailDelivery(mail.data, (message, idempotencyKey) =>
        resend.emails.send(message, { idempotencyKey }),
      );
    }
  }
  return handleOrder(
    request,
    delivery,
    createOrderProtection({ ...config.data, vercel }),
  );
}
