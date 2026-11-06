export type InvitationState = {
  expiresAt: Date;
  maxUses: number;
  revokedAt: Date | null;
  useCount: number;
};

export type InvitationAvailability = "available" | "exhausted" | "expired" | "revoked";

export function classifyInvitation(
  invitation: InvitationState,
  now: Date = new Date(),
): InvitationAvailability {
  if (invitation.revokedAt) return "revoked";
  if (invitation.expiresAt <= now) return "expired";
  if (invitation.useCount >= invitation.maxUses) return "exhausted";
  return "available";
}
