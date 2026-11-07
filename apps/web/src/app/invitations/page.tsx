import type { Metadata } from "next";
import Link from "next/link";
import { getInvitationService } from "@/domain/invitations/service";
import { requireMember } from "@/lib/session";
import { issueInvitation, revokeInvitation } from "./actions";
import { type InvitationListItem, InvitationManager } from "./invitation-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Invitations — Orkut Federated",
};

export default async function InvitationsPage() {
  const member = await requireMember();
  const invitations = await getInvitationService().listOwned(member.userId);
  const items: InvitationListItem[] = invitations.map((invitation) => ({
    createdAt: invitation.createdAt.toISOString(),
    expiresAt: invitation.expiresAt.toISOString(),
    id: invitation.id,
    maxUses: invitation.maxUses,
    revokedAt: invitation.revokedAt?.toISOString() ?? null,
    status: invitation.status,
    useCount: invitation.useCount,
  }));

  return (
    <main className="member-page">
      <header className="member-header">
        <div>
          <p className="eyebrow">Invite-only network</p>
          <h1 className="member-name">Invitations</h1>
          <p className="member-handle">Signed in as @{member.handle}</p>
        </div>
      </header>

      <p className="invitation-back">
        <Link className="text-link" href="/app">
          Back to your home
        </Link>
      </p>

      <InvitationManager
        initialInvitations={items}
        issue={issueInvitation}
        revoke={revokeInvitation}
      />
    </main>
  );
}
