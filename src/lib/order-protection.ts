import { createHmac, randomUUID } from "node:crypto";
import { isIP } from "node:net";

export class ProtectionError extends Error {
  constructor(
    public status: number,
    public code: string,
    public retryAfter?: number,
    public requestId?: string,
  ) {
    super(code);
  }
}

export interface OrderProtection {
  checkTraffic(request: Request): Promise<void>;
  verify(token: FormDataEntryValue | null): Promise<void>;
  reserve(
    digest: string,
    requestId: string,
  ): Promise<{ sent: boolean; requestId: string }>;
  complete(digest: string, requestId: string): Promise<void>;
}

// Redis time and atomic scripts keep limits consistent across serverless instances.
export const TRAFFIC_SCRIPT = `
local clock = redis.call('TIME')
local now = tonumber(clock[1]) * 1000 + math.floor(tonumber(clock[2]) / 1000)
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now - 60000)
if redis.call('ZCARD', KEYS[1]) >= 5 then return 0 end
redis.call('ZADD', KEYS[1], now, ARGV[1])
redis.call('EXPIRE', KEYS[1], 60)
return 1
`;

export const RESERVE_SCRIPT = `
local existing = redis.call('GET', KEYS[1])
if existing then return existing end
local clock = redis.call('TIME')
local now = tonumber(clock[1]) * 1000 + math.floor(tonumber(clock[2]) / 1000)
redis.call('ZREMRANGEBYSCORE', KEYS[2], '-inf', now - 3600000)
redis.call('ZREMRANGEBYSCORE', KEYS[3], '-inf', now - 86400000)
if redis.call('ZCARD', KEYS[2]) >= 20 or redis.call('ZCARD', KEYS[3]) >= 50 then
  return 'limited'
end
if redis.call('EXISTS', KEYS[4]) == 1 then return 'busy' end
redis.call('SET', KEYS[4], '1', 'EX', 20)
redis.call('ZADD', KEYS[2], now, ARGV[1])
redis.call('EXPIRE', KEYS[2], 3600)
redis.call('ZADD', KEYS[3], now, ARGV[1])
redis.call('EXPIRE', KEYS[3], 86400)
redis.call('SET', KEYS[1], 'pending:' .. ARGV[2], 'EX', 86400)
return 'new'
`;

type ProtectionConfig = {
  redisUrl: string;
  redisToken: string;
  secret: string;
  siteUrl: string;
  namespace: string;
  vercel: boolean;
};

export function createOrderProtection(
  config: ProtectionConfig,
  fetcher: typeof fetch = fetch,
): OrderProtection {
  const hostname = new URL(config.siteUrl).hostname;
  const prefix = `el-inside:${config.namespace}`;
  async function command(args: (string | number)[]) {
    try {
      const response = await fetcher(config.redisUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.redisToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(args),
        signal: AbortSignal.timeout(3000),
        cache: "no-store",
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (data.error || !("result" in data)) throw new Error();
      return data.result as unknown;
    } catch {
      throw new ProtectionError(503, "unavailable");
    }
  }
  return {
    async checkTraffic(request) {
      let ip = "local";
      if (config.vercel) {
        ip = request.headers.get("x-vercel-forwarded-for")?.trim() || "";
        if (!isIP(ip)) throw new ProtectionError(503, "unavailable");
      }
      const key = createHmac("sha256", config.redisToken)
        .update(ip)
        .digest("hex");
      const allowed = await command([
        "EVAL",
        TRAFFIC_SCRIPT,
        1,
        `${prefix}:ip:${key}`,
        randomUUID(),
      ]);
      if (allowed === 0) throw new ProtectionError(429, "rate_limited", 60);
      if (allowed !== 1) throw new ProtectionError(503, "unavailable");
    },
    async verify(token) {
      if (typeof token !== "string" || !token || token.length > 2048)
        throw new ProtectionError(403, "verification_failed");
      try {
        const response = await fetcher(
          "https://challenges.cloudflare.com/turnstile/v0/siteverify",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ secret: config.secret, response: token }),
            signal: AbortSignal.timeout(4000),
            cache: "no-store",
          },
        );
        if (!response.ok) throw new Error();
        const result = await response.json();
        if (
          result.success !== true ||
          result.hostname !== hostname ||
          result.action !== "order"
        )
          throw new ProtectionError(403, "verification_failed");
      } catch (error) {
        if (error instanceof ProtectionError) throw error;
        throw new ProtectionError(503, "unavailable");
      }
    },
    async reserve(digest, requestId) {
      const result = await command([
        "EVAL",
        RESERVE_SCRIPT,
        4,
        `${prefix}:order:${digest}`,
        `${prefix}:hour`,
        `${prefix}:day`,
        `${prefix}:spacing`,
        digest,
        requestId,
      ]);
      if (result === "limited")
        throw new ProtectionError(429, "rate_limited", 3600);
      if (result === "busy") throw new ProtectionError(429, "rate_limited", 20);
      if (result === "new") return { sent: false, requestId };
      if (typeof result === "string" && result.startsWith("sent:"))
        return { sent: true, requestId: result.slice(5) };
      if (typeof result === "string" && result.startsWith("pending:"))
        throw new ProtectionError(
          409,
          "delivery_uncertain",
          undefined,
          result.slice(8),
        );
      throw new ProtectionError(503, "unavailable");
    },
    async complete(digest, requestId) {
      const result = await command([
        "SET",
        `${prefix}:order:${digest}`,
        `sent:${requestId}`,
        "EX",
        86400,
      ]);
      if (result !== "OK") throw new ProtectionError(503, "unavailable");
    },
  };
}
