import { describe, expect, it } from "vitest";
import {
  createRateLimiter,
  enforceRateLimit,
  hashRateLimitValue,
  ipRangeKey,
  RateLimitExceededError,
  type RateLimitStore,
} from "./rate-limit";

const secret = "test-rate-limit-key-that-is-at-least-32-characters";

class MemoryRateLimitStore implements RateLimitStore {
  entries = new Map<string, { count: number; expiresAt: Date; windowStartedAt: Date }>();

  async increment(input: {
    key: string;
    windowStartedAt: Date;
    expiresAt: Date;
  }): Promise<number> {
    const existing = this.entries.get(input.key);
    const sameWindow =
      existing?.windowStartedAt.getTime() === input.windowStartedAt.getTime();
    const count = sameWindow && existing ? existing.count + 1 : 1;
    this.entries.set(input.key, { ...input, count });
    return count;
  }

  async pruneExpired(): Promise<void> {
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt.getTime() <= now) this.entries.delete(key);
    }
  }
}

describe("rate limiting", () => {
  it("counts inside a fixed window and reports retry time", async () => {
    const store = new MemoryRateLimitStore();
    const now = new Date("2026-11-07T12:00:30.000Z");
    const limiter = createRateLimiter({ now: () => now, store });
    const policy = {
      bucket: "test.actor",
      key: "member-1",
      limit: 2,
      windowSeconds: 60,
    };

    await expect(limiter.consume(policy)).resolves.toEqual({
      allowed: true,
      remaining: 1,
      retryAfterSeconds: 30,
    });
    await expect(limiter.consume(policy)).resolves.toEqual({
      allowed: true,
      remaining: 0,
      retryAfterSeconds: 30,
    });
    await expect(limiter.consume(policy)).resolves.toEqual({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 30,
    });
    expect(store.entries.get("test.actor:member-1")?.count).toBe(3);
  });

  it("resets the count in a new window", async () => {
    const store = new MemoryRateLimitStore();
    let now = new Date("2026-11-07T12:00:59.000Z");
    const limiter = createRateLimiter({ now: () => now, store });
    const policy = {
      bucket: "test.actor",
      key: "member-1",
      limit: 1,
      windowSeconds: 60,
    };

    expect((await limiter.consume(policy)).allowed).toBe(true);
    expect((await limiter.consume(policy)).allowed).toBe(false);

    now = new Date("2026-11-07T12:01:00.000Z");
    expect((await limiter.consume(policy)).allowed).toBe(true);
  });

  it("rejects invalid policies instead of silently disabling a limit", async () => {
    const limiter = createRateLimiter({ store: new MemoryRateLimitStore() });

    for (const policy of [
      { bucket: "test", key: "k", limit: 0, windowSeconds: 60 },
      { bucket: "test", key: "k", limit: 1, windowSeconds: 0 },
      { bucket: "test", key: "k", limit: 1.5, windowSeconds: 60 },
    ]) {
      await expect(limiter.consume(policy)).rejects.toThrow("invalid rate limit policy");
    }
  });

  it("throws a typed error with retry advice when a limit is exhausted", async () => {
    const limiter = createRateLimiter({
      now: () => new Date("2026-11-07T12:00:00.000Z"),
      store: new MemoryRateLimitStore(),
    });
    const policy = { bucket: "test", key: "k", limit: 1, windowSeconds: 60 };

    await enforceRateLimit(limiter, policy);
    const error = await enforceRateLimit(limiter, policy).catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(RateLimitExceededError);
    expect((error as RateLimitExceededError).retryAfterSeconds).toBe(60);
  });

  it("is a no-op when no limiter is configured", async () => {
    await expect(
      enforceRateLimit(undefined, {
        bucket: "test",
        key: "k",
        limit: 1,
        windowSeconds: 60,
      }),
    ).resolves.toBeUndefined();
  });

  it("hashes identifiers so plaintext never reaches storage", () => {
    const first = hashRateLimitValue("203.0.113.42", secret);
    const second = hashRateLimitValue("203.0.113.42", secret);

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toContain("203.0.113.42");
    expect(hashRateLimitValue("203.0.113.42", `${secret}-other`)).not.toBe(first);
  });

  it("collapses addresses to a coarse range", () => {
    expect(ipRangeKey("203.0.113.42")).toBe("203.0.113.0/24");
    expect(ipRangeKey("2001:db8:abcd:12::1")).toBe("2001:db8:abcd:12::/64");
    expect(ipRangeKey("not-an-ip")).toBe("unknown");
  });
});
