import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { getDatabase } from "@/db/client";
import * as databaseSchema from "@/db/schema";
import { getVerificationEmailTransport } from "./email-verification";
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
    emailVerification: {
      expiresIn: 60 * 60,
      sendOnSignUp: false,
      sendVerificationEmail: async ({ user, url }) => {
        await getVerificationEmailTransport().send({ to: user.email, url });
      },
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
