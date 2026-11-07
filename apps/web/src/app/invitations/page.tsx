import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { MiniProfile, OrkutBox } from "@/components/orkut";
import { getInvitationService } from "@/domain/invitations/service";
import { findPublicProfileByHandle } from "@/domain/profiles/service";
import { requireMember } from "@/lib/session";
import { issueInvitation, revokeInvitation } from "./actions";
import { type InvitationListItem, InvitationManager } from "./invitation-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Invitations — Orkut Federated",
};

export default async function InvitationsPage() {
  const member = await requireMember();
  const [invitations, profile] = await Promise.all([
    getInvitationService().listOwned(member.userId),
    findPublicProfileByHandle(member.handle),
  ]);
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
    <AppShell active="invitations" member={member}>
      <div className="orkut-columns">
        <aside className="orkut-sidebar">
          {profile ? (
            <OrkutBox title="Profile">
              <MiniProfile profile={profile} showPublicLink />
            </OrkutBox>
          ) : null}

          <OrkutBox title="Shortcuts">
            <ul className="side-menu">
              <li>
                <Link href="/app">Home</Link>
              </li>
              <li>
                <Link href={`/u/${member.handle}`}>View public profile</Link>
              </li>
            </ul>
          </OrkutBox>
        </aside>

        <div className="orkut-feed">
          <OrkutBox title="Invitations">
            <InvitationManager
              initialInvitations={items}
              issue={issueInvitation}
              revoke={revokeInvitation}
            />
          </OrkutBox>
        </div>

        <aside className="orkut-relations">
          <OrkutBox title="How invitations work">
            <ul className="next-list compact">
              <li>Each code is shown once and stored only as a keyed digest.</li>
              <li>Codes expire, can have a use limit, and can be revoked.</li>
              <li>Every redemption creates one verified member account.</li>
              <li>Public registration stays disabled.</li>
            </ul>
          </OrkutBox>
        </aside>
      </div>
    </AppShell>
  );
}
