import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { SignInForm } from "./sign-in-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in — Orkut Federated",
};

export default async function LoginPage() {
  if (await getCurrentMember()) redirect("/app");

  return (
    <main className="auth-page">
      <section aria-labelledby="sign-in-title" className="auth-card">
        <p className="eyebrow">Invite-only</p>
        <h1 className="auth-title" id="sign-in-title">
          Sign in
        </h1>
        <p className="auth-lead">
          Use the email and password you chose when you redeemed your invitation.
        </p>

        <SignInForm />

        <p className="auth-secondary">No invitation yet? Ask a member to send you one.</p>
        <Link className="text-link" href="/">
          Back to project home
        </Link>
      </section>
    </main>
  );
}
