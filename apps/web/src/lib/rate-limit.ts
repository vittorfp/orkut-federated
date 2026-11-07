import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { lt, sql } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { rateLimitCounters } from "@/db/schema";

export type RateLimitPolicy = {
  bucket: string;
  key: string;
  limit: number;
  windowSeconds: number;
};

export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export interface RateLimitStore {
  increment(input: {
    key: string;
    windowStartedAt: Date;
    expiresAt: Date;
  }): Promise<number>;
  pruneExpired(): Promise<void>;
}

export class RateLimitExceededError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("rate_limited");
    this.name = "RateLimitExceededError";
  }
}

type Database = ReturnType<typeof getDatabase>;

export function createDrizzleRateLimitStore(
  database: Database = getDatabase(),
): RateLimitStore {
  return {
    async increment({ key, windowStartedAt, expiresAt }) {
      const [row] = await database
        .insert(rateLimitCounters)
        .values({ count: 1, expiresAt, key, windowStartedAt })
        .onConflictDoUpdate({
          set: {
            count: sql`case
              when ${rateLimitCounters.windowStartedAt} = excluded.window_started_at
              then ${rateLimitCounters.count} + 1
              else 1
            end`,
            expiresAt: sql`excluded.expires_at`,
            windowStartedAt: sql`excluded.window_started_at`,
          },
          target: rateLimitCounters.key,
        })
        .returning({ count: rateLimitCounters.count });
      return row?.count ?? 1;
    },

    async pruneExpired() {
      await database
        .delete(rateLimitCounters)
        .where(lt(rateLimitCounters.expiresAt, new Date()));
    },
  };
}

export type RateLimiter = {
  consume(policy: RateLimitPolicy): Promise<RateLimitDecision>;
  pruneExpired(): Promise<void>;
};

type RateLimiterDependencies = {
  now?: () => Date;
  store: RateLimitStore;
};

export function createRateLimiter({
  now = () => new Date(),
  store,
}: RateLimiterDependencies): RateLimiter {
  return {
    async consume(policy) {
      if (
        !Number.isInteger(policy.limit) ||
        policy.limit < 1 ||
        !Number.isInteger(policy.windowSeconds) ||
        policy.windowSeconds < 1
      ) {
        throw new Error("invalid rate limit policy");
      }

      const nowMs = now().getTime();
      const windowMs = policy.windowSeconds * 1000;
      const windowStartedAt = new Date(Math.floor(nowMs / windowMs) * windowMs);
      const expiresAt = new Date(windowStartedAt.getTime() + windowMs);
      const count = await store.increment({
        expiresAt,
        key: `${policy.bucket}:${policy.key}`,
        windowStartedAt,
      });
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((expiresAt.getTime() - nowMs) / 1000),
      );

      return {
        allowed: count <= policy.limit,
        remaining: Math.max(0, policy.limit - count),
        retryAfterSeconds,
      };
    },

    pruneExpired() {
      return store.pruneExpired();
    },
  };
}

/**
 * Turns an unbounded dimension such as an IP address into a stable, opaque
 * rate-limit key. Plaintext network identifiers never reach the database.
 */
export function hashRateLimitValue(value: string, secret: string): string {
  // Bound the hashed input so a maliciously large code cannot turn a limit
  // check into an expensive request. Invitation codes are far below this cap.
  return createHmac("sha256", secret).update(value.slice(0, 256), "utf8").digest("hex");
}

/**
 * Collapses a client address to a coarse range before hashing so one actor
 * cannot rotate addresses inside the same subnet to reset a limit. Invalid
 * addresses share the "unknown" bucket instead of bypassing the check.
 */
export function ipRangeKey(address: string): string {
  const candidate = address.trim();
  const version = isIP(candidate);
  if (version === 4) {
    const octets = candidate.split(".").map(Number);
    return `${octets[0]}.${octets[1]}.${octets[2]}.0/24`;
  }
  if (version === 6) {
    const groups = candidate.toLowerCase().split(":").filter(Boolean).slice(0, 4);
    return `${groups.join(":") || "0"}::/64`;
  }
  return "unknown";
}

export async function enforceRateLimit(
  limiter: RateLimiter | undefined,
  policy: RateLimitPolicy,
): Promise<void> {
  if (!limiter) return;
  const decision = await limiter.consume(policy);
  if (!decision.allowed) throw new RateLimitExceededError(decision.retryAfterSeconds);
}
