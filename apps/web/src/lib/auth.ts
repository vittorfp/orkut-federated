import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { getDatabase } from "@/db/client";
import * as databaseSchema from "@/db/schema";
import { readServerEnvironment } from "./env";

let cachedAuthOptions: BetterAuthOptions | undefined;
let cachedAuth: ReturnType<typeof betterAuth> | undefined;

function createAuthOptions(): BetterAuthOptions {
  const environment = readServerEnvironment();
  return {
    baseURL: environment.BETTER_AUTH_URL,
    database: drizzleAdapter(getDatabase(), {
      provider: "pg",
      schema: databaseSchema,
      transaction: true,
      usePlural: true,
    }),
    emailAndPassword: {
      disableSignUp: true,
      enabled: true,
      requireEmailVerification: true,
    },
    secret: environment.BETTER_AUTH_SECRET,
  };
}

export function getAuthOptions(): BetterAuthOptions {
  cachedAuthOptions ??= createAuthOptions();
  return cachedAuthOptions;
}

export function getAuth(): ReturnType<typeof betterAuth> {
  cachedAuth ??= betterAuth(getAuthOptions());
  return cachedAuth;
}
