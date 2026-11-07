import type { Metadata } from "next";
import Link from "next/link";
import { requireMember } from "@/lib/session";
import { SignOutButton } from "./sign-out-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Home — Orkut Federated",
};

export default async function MemberHomePage() {
  const member = await requireMember();

  return (
    <main className="member-page">
      <header className="member-header">
        <div>
          <p className="eyebrow">Signed in</p>
          <h1 className="member-name">{member.publicName}</h1>
          <p className="member-handle">@{member.handle}</p>
        </div>
        <SignOutButton />
      </header>

      <section aria-labelledby="next-title" className="member-card">
        <h2 className="member-card-title" id="next-title">
          Your local network is starting
        </h2>
        <p>
          Profiles, friendships, posts, and communities arrive in the next MVP slices.
          Your handle is permanent.
        </p>
        <dl className="member-facts">
          <div>
            <dt>Email</dt>
            <dd>{member.email}</dd>
          </div>
          <div>
            <dt>Handle</dt>
            <dd>@{member.handle}</dd>
          </div>
        </dl>
      </section>

      <p>
        <Link className="text-link" href="/">
          Project home
        </Link>
      </p>
    </main>
  );
}
