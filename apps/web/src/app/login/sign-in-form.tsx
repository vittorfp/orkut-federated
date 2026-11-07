"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";

type Status = { kind: "error" | "info"; message: string } | null;

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [canResend, setCanResend] = useState(false);
  const [resent, setResent] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus(null);
    setCanResend(false);

    const { error } = await authClient.signIn.email({
      email,
      password,
      rememberMe: true,
    });

    if (error) {
      if (error.status === 403) {
        setStatus({
          kind: "error",
          message: "Verify your email before signing in.",
        });
        setCanResend(true);
      } else {
        setStatus({
          kind: "error",
          message: "Email or password is incorrect.",
        });
      }
      setPending(false);
      return;
    }

    router.replace("/app");
    router.refresh();
  }

  async function resendVerification() {
    setPending(true);
    setStatus(null);
    await authClient.sendVerificationEmail({ callbackURL: "/app", email });
    setResent(true);
    setStatus({
      kind: "info",
      message: "If that account still needs verification, a new link has been sent.",
    });
    setPending(false);
  }

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          autoComplete="email"
          id="email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          autoComplete="current-password"
          id="password"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </div>

      {status ? (
        <p aria-live="polite" className={`form-status ${status.kind}`} role="status">
          {status.message}
        </p>
      ) : null}

      <button className="primary-button" disabled={pending} type="submit">
        {pending ? "Signing in…" : "Sign in"}
      </button>

      {canResend && !resent ? (
        <button
          className="secondary-button"
          disabled={pending}
          onClick={resendVerification}
          type="button"
        >
          Resend verification email
        </button>
      ) : null}
    </form>
  );
}
