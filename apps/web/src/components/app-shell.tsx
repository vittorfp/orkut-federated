import Link from "next/link";
import type { ReactNode } from "react";
import { SignOutButton } from "./sign-out-button";

export type ShellMember = {
  handle: string;
  publicName: string;
};

type AppShellProps = {
  active?: "home" | "invitations" | "profile";
  children: ReactNode;
  member: ShellMember;
};

export function AppShell({ active, children, member }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="app-topbar-inner">
          <Link className="app-wordmark" href="/app">
            <span aria-hidden="true" className="app-mark">
              of
            </span>
            <span>Orkut Federated</span>
          </Link>

          <nav aria-label="Primary" className="app-nav">
            <Link aria-current={active === "home" ? "page" : undefined} href="/app">
              Home
            </Link>
            <Link
              aria-current={active === "profile" ? "page" : undefined}
              href={`/u/${member.handle}`}
            >
              Profile
            </Link>
            <Link
              aria-current={active === "invitations" ? "page" : undefined}
              href="/invitations"
            >
              Invitations
            </Link>
          </nav>

          <div className="app-account">
            <span className="app-account-name">{member.publicName}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="app-main">{children}</main>
    </div>
  );
}
