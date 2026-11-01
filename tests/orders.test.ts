import assert from "node:assert/strict";
import { test } from "node:test";
import { handleOrder as protectedOrder } from "../src/lib/order-service";
import {
  createMailDelivery,
  type MailConfig,
  type SendMail,
} from "../src/lib/order-delivery";
import type { OrderProtection } from "../src/lib/order-protection";
const guard: OrderProtection = {
  async checkTraffic() {},
  async verify() {},
  async reserve(_, requestId) {
    return { sent: false, requestId };
  },
  async complete() {},
};
const handleOrder = (req: Request, config: MailConfig | null, send: SendMail) =>
  protectedOrder(req, config ? createMailDelivery(config, send) : null, guard);
import { MAX_FILE_BYTES, MAX_REQUEST_BYTES } from "../src/lib/order-limits";

const config = { from: "studio@example.com", to: "owner@example.com" };
const base = {
  locale: "pl",
  kind: "catalog",
  product: "frog",
  version: "same",
  name: "Test customer",
  email: "customer@example.com",
  details: "",
  links: "",
  date: "",
  website: "",
  requestId: "cf9af5ab-41a2-4970-ae21-76050885f28b",
};
function request(
  values: Partial<typeof base> = {},
  files: File[] = [],
  origin = "https://example.com",
) {
  const form = new FormData();
  for (const [key, value] of Object.entries({ ...base, ...values }))
    form.set(key, value);
  for (const file of files) form.append("files", file);
  return new Request("https://example.com/api/orders/", {
    method: "POST",
    headers: { origin },
    body: form,
  });
}
function sender() {
  const calls: { message: Parameters<SendMail>[0]; key: string }[] = [];
  const send: SendMail = async (message, key) => {
    calls.push({ message, key });
    return { data: { id: "mock-email" }, error: null };
  };
  return { calls, send };
}

test("catalog enquiry targets only the configured owner and sets customer reply-to", async () => {
  const { send, calls } = sender();
  const response = await handleOrder(request(), config, send);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    requestId: base.requestId,
  });
  assert.deepEqual(calls[0].message.to, [config.to]);
  assert.equal(calls[0].message.replyTo, base.email);
  assert.match(calls[0].message.text ?? "", /Żabka podróżniczka/);
  assert.equal(calls[0].message.html, undefined);
});

test("custom English enquiry includes details, links and safe binary attachment", async () => {
  const { send, calls } = sender();
  const file = new File(
    ["%PDF-1.7\nExample test document"],
    "../reference.pdf",
    { type: "application/pdf" },
  );
  const response = await handleOrder(
    request(
      {
        locale: "en",
        kind: "custom",
        product: "",
        details: "A blue scarf <script>example</script>",
        links: "https://pinterest.com/example",
      },
      [file],
    ),
    config,
    send,
  );
  assert.equal(response.status, 200);
  assert.match(
    calls[0].message.text ?? "",
    /A blue scarf <script>example<\/script>/,
  );
  assert.equal(calls[0].message.attachments?.length, 1);
  const filename = calls[0].message.attachments?.[0].filename;
  assert.equal(typeof filename, "string");
  assert.equal(String(filename).includes("/"), false);
  assert.ok(Buffer.isBuffer(calls[0].message.attachments?.[0].content));
});

for (const [name, values] of Object.entries({
  "missing product": { product: "" },
  "unknown product": { product: "unlisted" },
  "missing custom description": { kind: "custom", product: "" },
  "missing change description": { version: "changes" },
  "empty name": { name: "  " },
  "email header injection": {
    email: "customer@example.com\r\nBcc:another@example.com",
  },
  "unknown locale": { locale: "be" },
  "unsafe reference link": { links: "javascript:alert(1)" },
  "oversized text": { details: "a".repeat(3001) },
  "past date": { date: "2020-01-01" },
  "invalid date": { date: "2030-02-31" },
  honeypot: { website: "spam.example" },
  "bad request ID": { requestId: "not-a-uuid" },
}))
  test(`rejects ${name} without sending`, async () => {
    const { calls, send } = sender();
    assert.equal(
      (await handleOrder(request(values), config, send)).status,
      400,
    );
    assert.equal(calls.length, 0);
  });

test("valid data without email configuration returns 503, never success", async () => {
  const { calls, send } = sender();
  assert.equal((await handleOrder(request(), null, send)).status, 503);
  assert.equal(calls.length, 0);
});

test("rejects other origins and absent origins", async () => {
  const { calls, send } = sender();
  for (const origin of ["https://attacker.example", ""])
    assert.equal(
      (await handleOrder(request({}, [], origin), config, send)).status,
      403,
    );
  assert.equal(calls.length, 0);
});

test("rejects files with false MIME declarations, empty files, excessive count or total bytes", async () => {
  const { calls, send } = sender();
  const valid = new File(["%PDF-1.7\n"], "file.pdf", {
    type: "application/pdf",
  });
  const cases: [File[], number][] = [
    [[new File(["not an image"], "fake.png", { type: "image/png" })], 400],
    [[new File([], "empty.jpg", { type: "image/jpeg" })], 400],
    [[new File(["<svg />"], "file.svg", { type: "image/svg+xml" })], 400],
    [Array.from({ length: 6 }, () => valid), 400],
    [
      [
        new File([new Uint8Array(MAX_FILE_BYTES + 1)], "big.jpg", {
          type: "image/jpeg",
        }),
      ],
      413,
    ],
  ];
  for (const [files, expected] of cases)
    assert.equal(
      (await handleOrder(request({}, files), config, send)).status,
      expected,
    );
  assert.equal(calls.length, 0);
});

test("caps streamed bodies even without content-length", async () => {
  const { calls, send } = sender();
  const req = new Request("https://example.com/api/orders/", {
    method: "POST",
    headers: {
      origin: "https://example.com",
      "content-type": "multipart/form-data; boundary=test",
    },
    body: new Uint8Array(MAX_REQUEST_BYTES + 1),
  });
  assert.equal((await handleOrder(req, config, send)).status, 413);
  assert.equal(calls.length, 0);
});

test("malformed multipart returns a validation error", async () => {
  const { send } = sender();
  const req = new Request("https://example.com/api/orders/", {
    method: "POST",
    headers: {
      origin: "https://example.com",
      "content-type": "multipart/form-data; boundary=test",
    },
    body: "broken",
  });
  assert.equal((await handleOrder(req, config, send)).status, 400);
});

test("provider errors and network failures never return success or disclose details", async () => {
  for (const send of [
    async () => ({ error: { message: "private-provider-detail" }, data: null }),
    async () => {
      throw new Error("private-key-detail");
    },
  ]) {
    const response = await handleOrder(request(), config, send);
    assert.equal(response.status, 409);
    assert.equal((await response.text()).includes("private"), false);
  }
});

test("retries retain the key while changed content gets a different key", async () => {
  const { calls, send } = sender();
  await handleOrder(request(), config, send);
  await handleOrder(request(), config, send);
  await handleOrder(request({ details: "Different colour" }), config, send);
  assert.equal(calls[0].key, calls[1].key);
  assert.notEqual(calls[0].key, calls[2].key);
});

test("uses the browser-facing host when Next.js normalizes the internal request URL", async () => {
  const { send } = sender();
  const req = request({}, [], "https://public.example.com");
  req.headers.set("host", "public.example.com");
  assert.equal((await handleOrder(req, null, send)).status, 503);
});

test("Russian enquiries retain the locale, translated piece and customer details", async () => {
  const { send, calls } = sender();
  const response = await handleOrder(
    request({ locale: "ru", details: "Зелёная лягушка" }),
    config,
    send,
  );
  assert.equal(response.status, 200);
  assert.match(calls[0].message.subject ?? "", /новая заявка/);
  assert.match(calls[0].message.text ?? "", /Language \/ Język: ru/);
  assert.match(calls[0].message.text ?? "", /Лягушка-путешественница/);
  assert.match(calls[0].message.text ?? "", /Зелёная лягушка/);
});
