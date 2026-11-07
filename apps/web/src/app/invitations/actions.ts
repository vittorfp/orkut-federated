"use server";

import { revalidatePath } from "next/cache";
import {
  getInvitationService,
  InvitationPolicyError,
} from "@/domain/invitations/service";
import { requireMember } from "@/lib/session";

const EXPIRY_DAYS = new Set([1, 7, 30]);
const DAY_MS = 24 * 60 * 60 * 1000;

export type IssueInvitationState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "success";
      code: string;
      expiresAt: string;
      maxUses: number;
    };

export type RevokeInvitationState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

function policyMessage(code: InvitationPolicyError["code"]): string {
  switch (code) {
    case "invalid_expiry":
      return "Choose an expiry between 1 and 30 days from now.";
    case "invalid_max_uses":
      return "Use limit must be a whole number from 1 to 100.";
    case "not_authorized":
      return "Your account cannot issue invitations.";
  }
}

export async function issueInvitation(
  _state: IssueInvitationState,
  formData: FormData,
): Promise<IssueInvitationState> {
  const member = await requireMember();
  const expiryDays = Number(formData.get("expiryDays"));
  if (!EXPIRY_DAYS.has(expiryDays)) {
    return { status: "error", message: "Choose an expiry of 1, 7, or 30 days." };
  }

  try {
    const issued = await getInvitationService().issue({
      expiresAt: new Date(Date.now() + expiryDays * DAY_MS),
      inviterUserId: member.userId,
      maxUses: Number(formData.get("maxUses")),
    });
    revalidatePath("/invitations");
    return {
      code: issued.code,
      expiresAt: issued.invitation.expiresAt.toISOString(),
      maxUses: issued.invitation.maxUses,
      status: "success",
    };
  } catch (error) {
    if (error instanceof InvitationPolicyError) {
      return { status: "error", message: policyMessage(error.code) };
    }
    throw error;
  }
}

export async function revokeInvitation(
  _state: RevokeInvitationState,
  formData: FormData,
): Promise<RevokeInvitationState> {
  const member = await requireMember();
  const invitationId = formData.get("invitationId");
  if (typeof invitationId !== "string" || invitationId.length === 0) {
    return { status: "error", message: "Invitation could not be identified." };
  }

  const revoked = await getInvitationService().revoke({
    invitationId,
    inviterUserId: member.userId,
  });
  revalidatePath("/invitations");

  if (!revoked) {
    // Covers another member's invitation as well as an already-closed one,
    // without revealing which case applies.
    return {
      status: "error",
      message: "That invitation is already closed or unavailable.",
    };
  }
  return { status: "success", message: "Invitation revoked." };
}
