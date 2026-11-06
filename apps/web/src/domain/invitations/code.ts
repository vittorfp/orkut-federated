import { createHmac, randomBytes } from "node:crypto";

const CODE_PREFIX = "ofi_";
const CODE_BYTES = 32;

export function generateInvitationCode(
  entropy: (size: number) => Buffer = randomBytes,
): string {
  return `${CODE_PREFIX}${entropy(CODE_BYTES).toString("base64url")}`;
}

export function digestInvitationCode(code: string, key: string): string {
  return createHmac("sha256", key).update(code, "utf8").digest("hex");
}
