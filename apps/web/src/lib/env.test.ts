import { describe, expect, it } from "vitest";
import { readServerEnvironment } from "./env";

describe("readServerEnvironment", () => {
  it("accepts a PostgreSQL URL and applies the default log level", () => {
    expect(
      readServerEnvironment({
        BETTER_AUTH_SECRET: "test-secret-that-is-at-least-32-characters",
        BETTER_AUTH_URL: "http://localhost:3000",
        DATABASE_URL: "postgres://user:password@localhost:5432/database",
        INVITATION_HASH_KEY: "test-invitation-key-at-least-32-characters",
      }),
    ).toEqual({
      BETTER_AUTH_SECRET: "test-secret-that-is-at-least-32-characters",
      BETTER_AUTH_URL: "http://localhost:3000",
      DATABASE_URL: "postgres://user:password@localhost:5432/database",
      INVITATION_HASH_KEY: "test-invitation-key-at-least-32-characters",
      LOG_LEVEL: "info",
    });
  });

  it("rejects a non-PostgreSQL database URL", () => {
    expect(() =>
      readServerEnvironment({
        BETTER_AUTH_SECRET: "test-secret-that-is-at-least-32-characters",
        BETTER_AUTH_URL: "http://localhost:3000",
        DATABASE_URL: "https://example.com/database",
        INVITATION_HASH_KEY: "test-invitation-key-at-least-32-characters",
      }),
    ).toThrow();
  });
});
