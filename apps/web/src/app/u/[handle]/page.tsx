import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { EmptyRelationGrid, MiniProfile, OrkutBox } from "@/components/orkut";
import { findPublicProfileByHandle } from "@/domain/profiles/service";

export const dynamic = "force-dynamic";

const getProfile = cache(findPublicProfileByHandle);

type ProfilePageProps = {
  params: Promise<{ handle: string }>;
};

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getProfile(handle);
  if (!profile) return { title: "Profile not found — Orkut Federated" };
  return {
    description: profile.bio || `Public profile for @${profile.handle}.`,
    title: `${profile.publicName} (@${profile.handle}) — Orkut Federated`,
  };
}

export default async function PublicProfilePage({ params }: ProfilePageProps) {
  const { handle } = await params;
  const profile = await getProfile(handle);
  if (!profile) notFound();

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="app-topbar-inner">
          <Link className="app-wordmark" href="/">
            <span aria-hidden="true" className="app-mark">
              of
            </span>
            <span>Orkut Federated</span>
          </Link>
          <div className="app-account">
            <Link className="topbar-link" href="/login">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="orkut-columns">
          <aside className="orkut-sidebar">
            <OrkutBox title="Profile">
              <MiniProfile profile={profile} />
            </OrkutBox>
          </aside>

          <div className="orkut-feed">
            <OrkutBox title={profile.publicName}>
              <p className="profile-handle">@{profile.handle}</p>
              <p className="profile-lede">
                {profile.bio || "This member has not written a bio yet."}
              </p>
              {profile.location ? (
                <p className="profile-meta">{profile.location}</p>
              ) : null}
            </OrkutBox>

            <OrkutBox title="Scraps">
              <p className="empty-note">
                No public scraps yet. Scrapbooks arrive after friendships.
              </p>
            </OrkutBox>
          </div>

          <aside className="orkut-relations">
            <OrkutBox title="Friends (0)">
              <EmptyRelationGrid
                label="Friends"
                note="Mutual friendships are planned for the next slice."
              />
            </OrkutBox>

            <OrkutBox title="Communities (0)">
              <EmptyRelationGrid
                label="Communities"
                note="Interest communities are planned for a later MVP."
              />
            </OrkutBox>

            <OrkutBox title="About this profile">
              <p className="empty-note">
                This read-only page shows public fields only. Email and session data are
                never exposed.
              </p>
            </OrkutBox>
          </aside>
        </div>
      </main>
    </div>
  );
}
