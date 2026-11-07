import { readServerEnvironment } from "@/lib/env";
import { digestInvitationCode, generateInvitationCode } from "./code";
import { classifyInvitation, type InvitationAvailability } from "./status";
import { createDrizzleInvitationStore, type InvitationStore } from "./store";

const MAX_USES = 100;
const MAX_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const INVITATION_CODE_PATTERN = /^ofi_[A-Za-z0-9_-]{43}$/;
const INVITATION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  generateCode?: () => string;
  hashKey: string;
  now?: () => Date;
  store: InvitationStore;
};

export function createInvitationService({
  generateCode = generateInvitationCode,
  hashKey,
  now = () => new Date(),
  store,
}: InvitationServiceDependencies): InvitationService {
  return {
    async issue({ expiresAt, inviterUserId, maxUses = 1 }) {
      const issuedAt = now();
      if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > MAX_USES) {
        throw new InvitationPolicyError("invalid_max_uses");
      }
      if (
        !Number.isFinite(expiresAt.getTime()) ||
        expiresAt <= issuedAt ||
        expiresAt.getTime() - issuedAt.getTime() > MAX_LIFETIME_MS
      ) {
        throw new InvitationPolicyError("invalid_expiry");
      }
      const code = generateCode();
      const invitation = await store.insertForActiveInviter({
        codeDigest: digestInvitationCode(code, hashKey),
        inviterUserId,
        maxUses,
        expiresAt,
      });
      if (!invitation) throw new InvitationPolicyError("not_authorized");

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
      if (!INVITATION_ID_PATTERN.test(invitationId)) return false;
      return store.revokeOwned({ invitationId, inviterUserId });
    },
  };
}

export function getInvitationService(): InvitationService {
  return createInvitationService({
    hashKey: readServerEnvironment().INVITATION_HASH_KEY,
    store: createDrizzleInvitationStore(),
  });
}
