import { Resend } from "resend";
import { z } from "zod";
import { handleOrder } from "@/lib/order-service";
export const runtime = "nodejs";
export const maxDuration = 30;
export async function POST(request: Request) {
  const config = z
    .object({ key: z.string().min(1), from: z.email(), to: z.email() })
    .safeParse({
      key: process.env.RESEND_API_KEY,
      from: process.env.RESEND_FROM_EMAIL,
      to: process.env.ORDER_TO_EMAIL,
    });
  return handleOrder(
    request,
    config.success ? config.data : null,
    async (message, idempotencyKey) => {
      if (!config.success) throw new Error("Email is not configured");
      const resend = new Resend(config.data.key);
      return resend.emails.send(message, { idempotencyKey });
    },
  );
}
