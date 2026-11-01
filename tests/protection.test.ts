import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createOrderProtection,
  ProtectionError,
  type OrderProtection,
} from "../src/lib/order-protection";
import { handleOrder } from "../src/lib/order-service";
import { createTelegramDelivery } from "../src/lib/order-delivery";
import type { Order } from "../src/lib/order-validation";

const config = {
  redisUrl: "https://redis.example.com",
  redisToken: "test-secret",
  secret: "test-turnstile-secret",
  siteUrl: "https://example.com",
  namespace: "test",
  vercel: true,
};
const order: Order = {
  locale: "ru",
  kind: "custom",
  product: "",
  version: "same",
  name: "Customer",
  email: "customer@example.com",
  details: "A scarf",
  links: "",
  date: "",
  website: "",
  requestId: "cf9af5ab-41a2-4970-ae21-76050885f28b",
};
const request = (values: Partial<Order> = {}) => {
  const data = new FormData();
  Object.entries({ ...order, ...values }).forEach(([key, value]) =>
    data.set(key, value),
  );
  data.set("cf-turnstile-response", "valid-token");
  return new Request("https://example.com/api/orders/", {
    method: "POST",
    headers: {
      origin: "https://example.com",
      "x-vercel-forwarded-for": "192.0.2.1",
    },
    body: data,
  });
};
const pass: OrderProtection = {
  async checkTraffic() {},
  async verify() {},
  async reserve(_, requestId) {
    return { sent: false, requestId };
  },
  async complete() {},
};
function mockFetch(
  handler: (url: string, init: RequestInit) => Response | Promise<Response>,
): typeof fetch {
  return (async (input, init) => handler(String(input), init!)) as typeof fetch;
}
const failure = (status: number) => (error: unknown) =>
  error instanceof ProtectionError && error.status === status;

test("no guard, failed CAPTCHA, exhausted quota and unavailable storage never dispatch", async () => {
  let calls = 0;
  const delivery = {
    destination: "test",
    async send() {
      calls++;
    },
  };
  assert.equal((await handleOrder(request(), delivery, null)).status, 503);
  for (const stage of ["checkTraffic", "verify", "reserve"] as const) {
    for (const status of [403, 429, 503]) {
      const guard = {
        ...pass,
        [stage]: async () => {
          throw new ProtectionError(status, "blocked", 60);
        },
      };
      const response = await handleOrder(request(), delivery, guard);
      assert.equal(response.status, status);
      assert.equal(response.headers.get("Retry-After"), "60");
    }
  }
  assert.equal(calls, 0);
});

test("concurrent repeats dispatch once, fresh UUID cannot bypass content deduplication", async () => {
  const states = new Map<string, { sent: boolean; requestId: string }>();
  let calls = 0;
  const guard: OrderProtection = {
    ...pass,
    async reserve(key, requestId) {
      const state = states.get(key);
      if (state?.sent) return state;
      if (state) throw new ProtectionError(409, "delivery_uncertain");
      states.set(key, { sent: false, requestId });
      return { sent: false, requestId };
    },
    async complete(key, requestId) {
      states.set(key, { sent: true, requestId });
    },
  };
  const delivery = {
    destination: "test",
    async send() {
      calls++;
    },
  };
  const responses = await Promise.all([
    handleOrder(request(), delivery, guard),
    handleOrder(request(), delivery, guard),
  ]);
  assert.deepEqual(
    responses.map((response) => response.status).sort(),
    [200, 409],
  );
  const duplicate = await handleOrder(
    request({ requestId: "a50844c1-e248-46f6-820e-3ca383334ef1" }),
    delivery,
    guard,
  );
  assert.equal(duplicate.status, 200);
  assert.equal((await duplicate.json()).requestId, order.requestId);
  assert.equal(calls, 1);
});

test("uncertain dispatch or failure recording success never claims confirmed delivery", async () => {
  const delivery = { destination: "test", async send() {} };
  const response = await handleOrder(request(), delivery, {
    ...pass,
    async complete() {
      throw new Error("secret");
    },
  });
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "delivery_uncertain" });
});

test("Turnstile requires valid token, expected hostname and action", async () => {
  let calls = 0;
  const guard = createOrderProtection(
    config,
    mockFetch(() => {
      calls++;
      return Response.json({
        success: true,
        hostname: "example.com",
        action: "order",
      });
    }),
  );
  for (const token of [null, "", "x".repeat(2049), new File(["test"], "token")])
    await assert.rejects(guard.verify(token), failure(403));
  assert.equal(calls, 0);
  await guard.verify("token");
  for (const data of [
    { success: false },
    { success: true, hostname: "attacker.example", action: "order" },
    { success: true, hostname: "example.com", action: "login" },
  ])
    await assert.rejects(
      createOrderProtection(
        config,
        mockFetch(() => Response.json(data)),
      ).verify("token"),
      failure(403),
    );
  await assert.rejects(
    createOrderProtection(
      config,
      mockFetch(() => {
        throw new Error("private");
      }),
    ).verify("token"),
    failure(503),
  );
});

test("uses only Vercel's IP header and never stores raw IP addresses", async () => {
  const commands: string[] = [];
  const guard = createOrderProtection(
    config,
    mockFetch((url, init) => {
      assert.equal(url, config.redisUrl);
      commands.push(String(init.body));
      return Response.json({ result: 1 });
    }),
  );
  const req = request();
  req.headers.set("x-forwarded-for", "spoofed");
  await guard.checkTraffic(req);
  req.headers.set("x-forwarded-for", "different-spoof");
  await guard.checkTraffic(req);
  const first = JSON.parse(commands[0]);
  assert.equal(first[3], JSON.parse(commands[1])[3]);
  assert.ok(!commands.join().includes("192.0.2.1"));
  req.headers.delete("x-vercel-forwarded-for");
  await assert.rejects(guard.checkTraffic(req), failure(503));
  assert.equal(commands.length, 2);
});

test("Redis errors, quota exhaustion and unknown responses fail closed", async () => {
  const blocked = createOrderProtection(
    config,
    mockFetch(() => Response.json({ result: 0 })),
  );
  await assert.rejects(blocked.checkTraffic(request()), failure(429));
  for (const response of [
    Response.json({ error: "quota" }),
    new Response("offline", { status: 503 }),
    Response.json({ result: "unexpected" }),
  ]) {
    const guard = createOrderProtection(
      config,
      mockFetch(() => response.clone()),
    );
    await assert.rejects(guard.checkTraffic(request()), failure(503));
  }
  for (const [result, status] of [
    ["limited", 429],
    ["busy", 429],
    ["pending:id", 409],
    ["unexpected", 503],
  ] as const) {
    const guard = createOrderProtection(
      config,
      mockFetch(() => Response.json({ result })),
    );
    await assert.rejects(
      guard.reserve("digest", order.requestId),
      failure(status),
    );
  }
  const guard = createOrderProtection(
    config,
    mockFetch(() => Response.json({ result: `sent:${order.requestId}` })),
  );
  assert.deepEqual(await guard.reserve("digest", "different"), {
    sent: true,
    requestId: order.requestId,
  });
});

test("Telegram sends one fixed-destination album with original files and complete enquiry", async () => {
  let calls = 0;
  const delivery = createTelegramDelivery(
    "123:fake",
    "-123456",
    mockFetch(async (url, init) => {
      calls++;
      assert.ok(url.endsWith("/sendMediaGroup"));
      const data = init.body as FormData;
      assert.equal(data.get("chat_id"), "-123456");
      const media = JSON.parse(String(data.get("media")));
      assert.equal(media.length, 2);
      assert.equal(media[0].type, "document");
      assert.equal(media[0].parse_mode, undefined);
      assert.equal(data.get("allow_paid_broadcast"), null);
      assert.match(await (data.get("file0") as File).text(), /A scarf/);
      assert.equal(await (data.get("file1") as File).text(), "%PDF-1.7");
      return Response.json({
        ok: true,
        result: [{ message_id: 1 }, { message_id: 2 }],
      });
    }),
  );
  await delivery.send(
    order,
    [
      {
        filename: "reference.pdf",
        content: Buffer.from("%PDF-1.7"),
        contentType: "application/pdf",
      },
    ],
    "key",
  );
  assert.equal(calls, 1);
});

test("Telegram without references sends a document; errors are never automatically retried", async () => {
  let calls = 0;
  const delivery = createTelegramDelivery(
    "123:fake",
    "123456",
    mockFetch((url) => {
      calls++;
      assert.ok(url.endsWith("/sendDocument"));
      return Response.json({
        ok: false,
        description: "private-provider-detail",
      });
    }),
  );
  const response = await handleOrder(request(), delivery, pass);
  assert.equal(response.status, 409);
  assert.equal(calls, 1);
  assert.ok(!(await response.text()).includes("private"));
});

test("pending duplicate returns its original enquiry number", async () => {
  const guard = createOrderProtection(
    config,
    mockFetch(() => Response.json({ result: `pending:${order.requestId}` })),
  );
  await assert.rejects(
    guard.reserve("digest", "fresh-id"),
    (error: unknown) =>
      error instanceof ProtectionError && error.requestId === order.requestId,
  );
});
