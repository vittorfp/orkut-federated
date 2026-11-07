import { z } from "zod";
import { validateHandle } from "@/domain/handles";
import {
  type AuditRecorder,
  createDrizzleAuditRecorder,
  tryRecordAudit,
} from "@/lib/audit";
import { readServerEnvironment } from "@/lib/env";
import {
  createDrizzleRateLimitStore,
  createRateLimiter,
  enforceRateLimit,
  hashRateLimitValue,
  ipRangeKey,
  RateLimitExceededError,
  type RateLimiter,
  type RateLimitPolicy,
} from "@/lib/rate-limit";
import { digestInvitationCode } from "./code";
import { createDrizzleRedemptionStore, type RedemptionStore } from "./redemption-store";

const INVITATION_CODE_PATTERN = /^ofi_[A-Za-z0-9_-]{43}$/;
// Matches Better Auth's password policy defaults for the pinned version.
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const MAX_PUBLIC_NAME_LENGTH = 100;

export type RedeemInvitationInput = {
  clientIp?: string;
  code: string;
  email: string;
  handle: string;
  password: string;
  publicName: string;
};

export const REDEMPTION_RATE_LIMITS = {
  digest: {
    bucket: "invitation.redemption.digest",
    limit: 30,
    windowSeconds: 5 * 60,
  },
  endpoint: {
    bucket: "invitation.redemption.endpoint",
    limit: 600,
    windowSeconds: 60,
  },
  ipRange: {
    bucket: "invitation.redemption.ip_range",
    limit: 20,
    windowSeconds: 10 * 60,
  },
} as const satisfies Record<string, Omit<RateLimitPolicy, "key">>;

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
  audit?: AuditRecorder;
  hashKey: string;
  limiter?: RateLimiter;
  store: RedemptionStore;
};

function normalizePublicName(input: string): string {
  return input.trim();
}

export function createRedemptionService({
  audit,
  hashKey,
  limiter,
  store,
}: RedemptionServiceDependencies): RedemptionService {
  async function rejection(reason: RedemptionErrorCode): Promise<RedemptionError> {
    await tryRecordAudit(audit, {
      action: "invitation.redemption",
      detail: { reason },
      outcome: "rejected",
    });
    return new RedemptionError(reason);
  }

  return {
    async redeem(input) {
      try {
        await enforceRateLimit(limiter, {
          ...REDEMPTION_RATE_LIMITS.endpoint,
          key: "global",
        });
        await enforceRateLimit(limiter, {
          ...REDEMPTION_RATE_LIMITS.digest,
          key: hashRateLimitValue(input.code, hashKey),
        });
        if (input.clientIp) {
          await enforceRateLimit(limiter, {
            ...REDEMPTION_RATE_LIMITS.ipRange,
            key: hashRateLimitValue(ipRangeKey(input.clientIp), hashKey),
          });
        }
      } catch (error) {
        if (error instanceof RateLimitExceededError) {
          await tryRecordAudit(audit, {
            action: "invitation.redemption",
            detail: { retryAfterSeconds: error.retryAfterSeconds },
            outcome: "rate_limited",
          });
        }
        throw error;
      }

      if (!INVITATION_CODE_PATTERN.test(input.code)) {
        throw await rejection("invitation_unavailable");
      }

      const email = input.email.trim().toLowerCase();
      if (!z.email().safeParse(email).success) {
        throw await rejection("invalid_email");
      }
      if (
        input.password.length < MIN_PASSWORD_LENGTH ||
        input.password.length > MAX_PASSWORD_LENGTH
      ) {
        throw await rejection("invalid_password");
      }

      const handle = validateHandle(input.handle);
      if (!handle.valid) throw await rejection("invalid_handle");

      const publicName = normalizePublicName(input.publicName);
      if (publicName.length < 1 || publicName.length > MAX_PUBLIC_NAME_LENGTH) {
        throw await rejection("invalid_public_name");
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
          throw await rejection("invitation_unavailable");
        }
        throw await rejection("identity_conflict");
      }

      await tryRecordAudit(audit, {
        action: "invitation.redemption",
        actorUserId: result.userId,
        detail: {},
        invitationId: result.invitationId,
        outcome: "success",
      });

      return { userId: result.userId };
    },
  };
}

export function getRedemptionService(): RedemptionService {
  return createRedemptionService({
    audit: createDrizzleAuditRecorder(),
    hashKey: readServerEnvironment().INVITATION_HASH_KEY,
    limiter: createRateLimiter({ store: createDrizzleRateLimitStore() }),
    store: createDrizzleRedemptionStore(),
  });
}
