import assert from "node:assert/strict";
import { test } from "node:test";
import { POST } from "../src/app/api/orders/route";

test("route refuses disabled sending and hosted Cloudflare test keys before external calls", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    throw new Error("External call must not happen");
  });
  const values = {
    ORDERS_ENABLED: "true",
    VERCEL: "1",
    ORDER_DELIVERY: "telegram",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
    TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
    UPSTASH_REDIS_REST_URL: "https://redis.example.com",
    UPSTASH_REDIS_REST_TOKEN: "test-redis-token",
    SITE_URL: "https://example.com",
    ORDER_LIMIT_NAMESPACE: "test",
    TELEGRAM_BOT_TOKEN: "123:test",
    TELEGRAM_CHAT_ID: "123",
  };
  const previous = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, values);
  const request = () =>
    new Request("https://example.com/api/orders/", {
      method: "POST",
      headers: { origin: "https://example.com" },
    });
  try {
    assert.equal((await POST(request())).status, 503);
    process.env.ORDERS_ENABLED = "false";
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "real-looking-site-key";
    process.env.TURNSTILE_SECRET_KEY = "real-looking-secret";
    assert.equal((await POST(request())).status, 503);
    assert.equal(calls, 0);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
