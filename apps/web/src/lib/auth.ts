import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { getDatabase } from "@/db/client";
import * as databaseSchema from "@/db/schema";
import { readServerEnvironment } from "./env";

const environment = readServerEnvironment();

export const auth = betterAuth({
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
});
