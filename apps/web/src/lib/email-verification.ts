import { appendFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export type VerificationEmail = {
  to: string;
  url: string;
};

export interface VerificationEmailTransport {
  send(message: VerificationEmail): Promise<void>;
}

const DEFAULT_OUTBOX = ".mail-outbox/verification.jsonl";

/**
 * Development and test transport. Verification links contain single-use
 * bearer tokens, so they are written to a private local file instead of logs.
 * A real delivery transport must replace this before a public deployment.
 */
export function createOutboxTransport(
  path: string = DEFAULT_OUTBOX,
): VerificationEmailTransport {
  return {
    async send(message) {
      const target = resolve(/* turbopackIgnore: true */ path);
      await mkdir(dirname(target), { mode: 0o700, recursive: true });
      await appendFile(
        target,
        `${JSON.stringify({ ...message, sentAt: new Date().toISOString() })}\n`,
        { encoding: "utf8", mode: 0o600 },
      );
    },
  };
}

let cachedTransport: VerificationEmailTransport | undefined;

export function getVerificationEmailTransport(): VerificationEmailTransport {
  cachedTransport ??= createOutboxTransport(
    process.env.VERIFICATION_MAIL_OUTBOX ?? DEFAULT_OUTBOX,
  );
  return cachedTransport;
}
