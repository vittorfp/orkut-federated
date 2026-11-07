import { runWithTransaction } from "@better-auth/core/context";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import type { getDatabase } from "@/db/client";
import * as databaseSchema from "@/db/schema";
import { getAuth, getAuthOptions } from "./auth";

type Database = ReturnType<typeof getDatabase>;
export type AuthTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type AuthContext = Awaited<ReturnType<typeof getAuth>["$context"]>;

/**
 * Runs Better Auth work against the caller's Drizzle transaction.
 *
 * Better Auth 1.7.17 keeps the active adapter in AsyncLocalStorage. Binding a
 * transaction-scoped adapter there keeps principal, credential, and session
 * writes inside the surrounding transaction, so a redemption failure cannot
 * leave a partial account behind. The pinned version is covered by the
 * dependency contract test in `scripts/verify-redemption.ts`.
 */
async function runInTransaction<T>(
  transaction: AuthTransaction,
  work: (context: AuthContext) => Promise<T>,
): Promise<T> {
  const transactionAdapter = drizzleAdapter(
    transaction as unknown as Parameters<typeof drizzleAdapter>[0],
    {
      provider: "pg",
      schema: databaseSchema,
      transaction: false,
      usePlural: true,
    },
  )(getAuthOptions());

  return runWithTransaction(transactionAdapter, async () =>
    work(await getAuth().$context),
  );
}

export class PrincipalEmailConflictError extends Error {
  constructor() {
    super("credential principal email already exists");
    this.name = "PrincipalEmailConflictError";
  }
}

export type NewCredentialPrincipal = {
  email: string;
  name: string;
  password: string;
};

export async function createCredentialPrincipal(
  transaction: AuthTransaction,
  input: NewCredentialPrincipal,
): Promise<{ id: string }> {
  return runInTransaction(transaction, async (context) => {
    if (await context.internalAdapter.findUserByEmail(input.email)) {
      throw new PrincipalEmailConflictError();
    }

    const hash = await context.password.hash(input.password);
    const user = await context.internalAdapter.createUser(
      {
        email: input.email,
        emailVerified: false,
        name: input.name,
      },
      { method: "email-password" },
    );
    if (!user) throw new Error("credential principal insert returned no record");

    await context.internalAdapter.linkAccount({
      accountId: user.id,
      password: hash,
      providerId: "credential",
      userId: user.id,
    });

    return { id: user.id };
  });
}
