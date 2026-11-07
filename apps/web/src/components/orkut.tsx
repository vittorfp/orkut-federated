import Link from "next/link";
import type { ReactNode } from "react";
import type { PublicProfile } from "@/domain/profiles/service";

type OrkutBoxProps = {
  children: ReactNode;
  className?: string;
  title: string;
};

export function OrkutBox({ children, className, title }: OrkutBoxProps) {
  return (
    <section className={`orkut-box${className ? ` ${className}` : ""}`}>
      <h2 className="orkut-box-title">{title}</h2>
      <div className="orkut-box-body">{children}</div>
    </section>
  );
}

export function InitialsAvatar({
  name,
  size = "large",
}: {
  name: string;
  size?: "small" | "large";
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <span aria-hidden="true" className={`initials-avatar avatar-${size}`}>
      {initials || "?"}
    </span>
  );
}

const memberSinceFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

export function MemberSince({ createdAt }: { createdAt: Date }) {
  return (
    <time dateTime={createdAt.toISOString()}>
      {memberSinceFormatter.format(createdAt)}
    </time>
  );
}

export function MiniProfile({
  profile,
  showPublicLink = false,
}: {
  profile: PublicProfile;
  showPublicLink?: boolean;
}) {
  return (
    <div className="mini-profile">
      <InitialsAvatar name={profile.publicName} />
      <p className="mini-profile-name">{profile.publicName}</p>
      <p className="mini-profile-handle">@{profile.handle}</p>
      {profile.location ? <p className="mini-profile-meta">{profile.location}</p> : null}
      <p className="mini-profile-meta">
        Member since <MemberSince createdAt={profile.createdAt} />
      </p>

      {showPublicLink ? (
        <p className="mini-profile-link">
          <Link className="text-link" href={`/u/${profile.handle}`}>
            View public profile
          </Link>
        </p>
      ) : null}

      {profile.interests.length > 0 ? (
        <>
          <hr className="orkut-separator" />
          <p className="mini-profile-label">Interests</p>
          <ul className="interest-list">
            {profile.interests.slice(0, 8).map((interest) => (
              <li key={interest}>{interest}</li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

export function EmptyRelationGrid({ label, note }: { label: string; note: string }) {
  return (
    <div className="relation-empty">
      <ul aria-label={label} className="relation-grid">
        {Array.from({ length: 6 }, (_, index) => `slot-${index}`).map((slot) => (
          <li aria-hidden="true" className="relation-placeholder" key={slot}>
            <span />
          </li>
        ))}
      </ul>
      <p>{note}</p>
    </div>
  );
}
