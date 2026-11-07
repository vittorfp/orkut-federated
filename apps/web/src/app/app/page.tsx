import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { EmptyRelationGrid, MiniProfile, OrkutBox } from "@/components/orkut";
import { findPublicProfileByHandle } from "@/domain/profiles/service";
import { requireMember } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Home — Orkut Federated",
};

export default async function MemberHomePage() {
  const member = await requireMember();
  const profile = await findPublicProfileByHandle(member.handle);

  return (
    <AppShell active="home" member={member}>
      <div className="orkut-columns">
        <aside className="orkut-sidebar">
          <OrkutBox title="Profile">
            {profile ? (
              <MiniProfile profile={profile} showPublicLink />
            ) : (
              <p>Your profile is still being prepared.</p>
            )}
          </OrkutBox>

          <OrkutBox title="Shortcuts">
            <ul className="side-menu">
              <li>
                <Link href="/invitations">Manage invitations</Link>
              </li>
              <li>
                <Link href={`/u/${member.handle}`}>View public profile</Link>
              </li>
            </ul>
          </OrkutBox>
        </aside>

        <div className="orkut-feed">
          <OrkutBox title={`Welcome, ${member.publicName}`}>
            <p className="profile-lede">
              This is your corner of an invite-only, federated network. Your handle is
              permanent; the rest of your profile can grow as the product does.
            </p>
            <div className="quick-actions">
              <Link className="primary-link" href="/invitations">
                Invite someone
              </Link>
              <Link className="secondary-button" href={`/u/${member.handle}`}>
                See your profile
              </Link>
            </div>
          </OrkutBox>

          <OrkutBox title="Your network is starting">
            <p className="profile-lede">
              Friendships, scraps, testimonials, communities, and photos arrive in the
              next slices. Federation comes after the local network is safe and useful.
            </p>
            <ul className="next-list">
              <li>Friends and mutual connections</li>
              <li>Scrapbooks and testimonials</li>
              <li>Interest communities</li>
              <li>ActivityPub federation</li>
            </ul>
          </OrkutBox>

          <OrkutBox title="Scraps">
            <p className="empty-note">
              Your scrapbook is empty for now. Scraps are planned after friendships.
            </p>
          </OrkutBox>
        </div>

        <aside className="orkut-relations">
          <OrkutBox title="Friends (0)">
            <EmptyRelationGrid
              label="Friends"
              note="Invite people you trust; mutual friendships come next."
            />
          </OrkutBox>

          <OrkutBox title="Communities (0)">
            <EmptyRelationGrid
              label="Communities"
              note="Interest communities are planned for a later MVP."
            />
          </OrkutBox>

          <OrkutBox title="Invitations">
            <p className="empty-note">Every member can issue bounded invitation codes.</p>
            <Link className="text-link" href="/invitations">
              Manage your invitations
            </Link>
          </OrkutBox>
        </aside>
      </div>
    </AppShell>
  );
}
