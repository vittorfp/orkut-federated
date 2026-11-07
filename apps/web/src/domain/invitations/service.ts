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
  RateLimitExceededError,
  type RateLimiter,
  type RateLimitPolicy,
} from "@/lib/rate-limit";
import { digestInvitationCode, generateInvitationCode } from "./code";
import { classifyInvitation, type InvitationAvailability } from "./status";
import { createDrizzleInvitationStore, type InvitationStore } from "./store";

const MAX_USES = 100;
const MAX_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const INVITATION_CODE_PATTERN = /^ofi_[A-Za-z0-9_-]{43}$/;
const INVITATION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const INVITATION_RATE_LIMITS = {
  issue: {
    bucket: "invitation.issue.actor",
    limit: 10,
    windowSeconds: 60 * 60,
  },
  preview: {
    bucket: "invitation.preview.digest",
    limit: 60,
    windowSeconds: 60,
  },
  previewEndpoint: {
    bucket: "invitation.preview.endpoint",
    limit: 600,
    windowSeconds: 60,
  },
  revoke: {
    bucket: "invitation.revoke.actor",
    limit: 30,
    windowSeconds: 60 * 60,
  },
} as const satisfies Record<string, Omit<RateLimitPolicy, "key">>;

export type IssueInvitationInput = {
  expiresAt: Date;
  inviterUserId: string;
  maxUses?: number;
};

export type IssuedInvitation = {
  code: string;
  invitation: {
    expiresAt: Date;
    id: string;
    maxUses: number;
  };
};

export type ListedInvitation = {
  createdAt: Date;
  expiresAt: Date;
  id: string;
  maxUses: number;
  revokedAt: Date | null;
  status: InvitationAvailability;
  useCount: number;
};

export type InvitationService = {
  issue(input: IssueInvitationInput): Promise<IssuedInvitation>;
  listOwned(inviterUserId: string): Promise<ListedInvitation[]>;
  preview(code: string): Promise<{ available: boolean }>;
  revoke(input: { invitationId: string; inviterUserId: string }): Promise<boolean>;
};

export class InvitationPolicyError extends Error {
  constructor(
    public readonly code: "invalid_expiry" | "invalid_max_uses" | "not_authorized",
  ) {
    super(code);
    this.name = "InvitationPolicyError";
  }
}

type InvitationServiceDependencies = {
  audit?: AuditRecorder;
  generateCode?: () => string;
  hashKey: string;
  limiter?: RateLimiter;
  now?: () => Date;
  store: InvitationStore;
};

export function createInvitationService({
  audit,
  generateCode = generateInvitationCode,
  hashKey,
  limiter,
  now = () => new Date(),
  store,
}: InvitationServiceDependencies): InvitationService {
  return {
    async issue({ expiresAt, inviterUserId, maxUses = 1 }) {
      try {
        await enforceRateLimit(limiter, {
          ...INVITATION_RATE_LIMITS.issue,
          key: inviterUserId,
        });
      } catch (error) {
        if (error instanceof RateLimitExceededError) {
          await tryRecordAudit(audit, {
            action: "invitation.issue",
            actorUserId: inviterUserId,
            detail: {
              bucket: INVITATION_RATE_LIMITS.issue.bucket,
              retryAfterSeconds: error.retryAfterSeconds,
            },
            outcome: "rate_limited",
          });
        }
        throw error;
      }

      const issuedAt = now();
      if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > MAX_USES) {
        await tryRecordAudit(audit, {
          action: "invitation.issue",
          actorUserId: inviterUserId,
          detail: { reason: "invalid_max_uses" },
          outcome: "rejected",
        });
        throw new InvitationPolicyError("invalid_max_uses");
      }
      if (
        !Number.isFinite(expiresAt.getTime()) ||
        expiresAt <= issuedAt ||
        expiresAt.getTime() - issuedAt.getTime() > MAX_LIFETIME_MS
      ) {
        await tryRecordAudit(audit, {
          action: "invitation.issue",
          actorUserId: inviterUserId,
          detail: { reason: "invalid_expiry" },
          outcome: "rejected",
        });
        throw new InvitationPolicyError("invalid_expiry");
      }
      const code = generateCode();
      const invitation = await store.insertForActiveInviter({
        codeDigest: digestInvitationCode(code, hashKey),
        inviterUserId,
        maxUses,
        expiresAt,
      });
      if (!invitation) {
        await tryRecordAudit(audit, {
          action: "invitation.issue",
          actorUserId: inviterUserId,
          detail: { reason: "not_authorized" },
          outcome: "rejected",
        });
        throw new InvitationPolicyError("not_authorized");
      }
      await tryRecordAudit(audit, {
        action: "invitation.issue",
        actorUserId: inviterUserId,
        detail: {
          expiresInHours: Math.round(
            (invitation.expiresAt.getTime() - issuedAt.getTime()) / (60 * 60 * 1000),
          ),
          maxUses: invitation.maxUses,
        },
        invitationId: invitation.id,
        outcome: "success",
      });

      return {
        code,
        invitation: {
          expiresAt: invitation.expiresAt,
          id: invitation.id,
          maxUses: invitation.maxUses,
        },
      };
    },

    async preview(code) {
      await enforceRateLimit(limiter, {
        ...INVITATION_RATE_LIMITS.previewEndpoint,
        key: "global",
      });
      await enforceRateLimit(limiter, {
        ...INVITATION_RATE_LIMITS.preview,
        key: hashRateLimitValue(code, hashKey),
      });
      if (!INVITATION_CODE_PATTERN.test(code)) return { available: false };
      const invitation = await store.findByDigest(digestInvitationCode(code, hashKey));
      return {
        available: invitation
          ? classifyInvitation(invitation, now()) === "available"
          : false,
      };
    },

    async listOwned(inviterUserId) {
      const listTime = now();
      const records = await store.listOwned(inviterUserId);
      // Rebuild each record explicitly so a store cannot leak code digests or
      // future internal columns into a client payload.
      return records.map((record) => ({
        createdAt: record.createdAt,
        expiresAt: record.expiresAt,
        id: record.id,
        maxUses: record.maxUses,
        revokedAt: record.revokedAt,
        status: classifyInvitation(record, listTime),
        useCount: record.useCount,
      }));
    },

    async revoke({ invitationId, inviterUserId }) {
      try {
        await enforceRateLimit(limiter, {
          ...INVITATION_RATE_LIMITS.revoke,
          key: inviterUserId,
        });
      } catch (error) {
        if (error instanceof RateLimitExceededError) {
          await tryRecordAudit(audit, {
            action: "invitation.revoke",
            actorUserId: inviterUserId,
            detail: {
              bucket: INVITATION_RATE_LIMITS.revoke.bucket,
              retryAfterSeconds: error.retryAfterSeconds,
            },
            outcome: "rate_limited",
          });
        }
        throw error;
      }

      if (!INVITATION_ID_PATTERN.test(invitationId)) {
        await tryRecordAudit(audit, {
          action: "invitation.revoke",
          actorUserId: inviterUserId,
          detail: { reason: "invalid_id" },
          outcome: "rejected",
        });
        return false;
      }
      const revoked = await store.revokeOwned({ invitationId, inviterUserId });
      await tryRecordAudit(audit, {
        action: "invitation.revoke",
        actorUserId: inviterUserId,
        detail: revoked ? {} : { reason: "unavailable" },
        invitationId,
        outcome: revoked ? "success" : "rejected",
      });
      return revoked;
    },
  };
}

export function getInvitationService(): InvitationService {
  return createInvitationService({
    audit: createDrizzleAuditRecorder(),
    hashKey: readServerEnvironment().INVITATION_HASH_KEY,
    limiter: createRateLimiter({ store: createDrizzleRateLimitStore() }),
    store: createDrizzleInvitationStore(),
  });
}
