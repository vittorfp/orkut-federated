import { z } from "zod";
import { validateHandle } from "@/domain/handles";
import { readServerEnvironment } from "@/lib/env";
import { digestInvitationCode } from "./code";
import { createDrizzleRedemptionStore, type RedemptionStore } from "./redemption-store";

const INVITATION_CODE_PATTERN = /^ofi_[A-Za-z0-9_-]{43}$/;
// Matches Better Auth's password policy defaults for the pinned version.
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const MAX_PUBLIC_NAME_LENGTH = 100;

export type RedeemInvitationInput = {
  code: string;
  email: string;
  handle: string;
  password: string;
  publicName: string;
};

export type RedemptionService = {
  redeem(input: RedeemInvitationInput): Promise<{ userId: string }>;
};

export type RedemptionErrorCode =
  | "identity_conflict"
  | "invalid_email"
  | "invalid_handle"
  | "invalid_password"
  | "invalid_public_name"
  | "invitation_unavailable";

export class RedemptionError extends Error {
  constructor(public readonly code: RedemptionErrorCode) {
    super(code);
    this.name = "RedemptionError";
  }
}

type RedemptionServiceDependencies = {
  hashKey: string;
  store: RedemptionStore;
};

function normalizePublicName(input: string): string {
  return input.trim();
}

export function createRedemptionService({
  hashKey,
  store,
}: RedemptionServiceDependencies): RedemptionService {
  return {
    async redeem(input) {
      if (!INVITATION_CODE_PATTERN.test(input.code)) {
        throw new RedemptionError("invitation_unavailable");
      }

      const email = input.email.trim().toLowerCase();
      if (!z.email().safeParse(email).success) {
        throw new RedemptionError("invalid_email");
      }
      if (
        input.password.length < MIN_PASSWORD_LENGTH ||
        input.password.length > MAX_PASSWORD_LENGTH
      ) {
        throw new RedemptionError("invalid_password");
      }

      const handle = validateHandle(input.handle);
      if (!handle.valid) throw new RedemptionError("invalid_handle");

      const publicName = normalizePublicName(input.publicName);
      if (publicName.length < 1 || publicName.length > MAX_PUBLIC_NAME_LENGTH) {
        throw new RedemptionError("invalid_public_name");
      }

      const result = await store.redeem({
        codeDigest: digestInvitationCode(input.code, hashKey),
        email,
        handle: handle.handle,
        password: input.password,
        publicName,
      });

      if (!result.ok) {
        if (result.reason === "invitation_unavailable") {
          throw new RedemptionError("invitation_unavailable");
        }
        throw new RedemptionError("identity_conflict");
      }

      return { userId: result.userId };
    },
  };
}

export function getRedemptionService(): RedemptionService {
  return createRedemptionService({
    hashKey: readServerEnvironment().INVITATION_HASH_KEY,
    store: createDrizzleRedemptionStore(),
  });
}
