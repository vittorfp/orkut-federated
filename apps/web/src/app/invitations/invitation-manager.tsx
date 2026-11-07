"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { IssueInvitationState, RevokeInvitationState } from "./actions";

export type InvitationListItem = {
  createdAt: string;
  expiresAt: string;
  id: string;
  maxUses: number;
  revokedAt: string | null;
  status: "available" | "exhausted" | "expired" | "revoked";
  useCount: number;
};

type IssueAction = (
  state: IssueInvitationState,
  formData: FormData,
) => Promise<IssueInvitationState>;

type RevokeAction = (
  state: RevokeInvitationState,
  formData: FormData,
) => Promise<RevokeInvitationState>;

type Props = {
  initialInvitations: InvitationListItem[];
  issue: IssueAction;
  revoke: RevokeAction;
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

const statusLabels: Record<InvitationListItem["status"], string> = {
  available: "Available",
  exhausted: "Fully used",
  expired: "Expired",
  revoked: "Revoked",
};

function formatDate(iso: string): string {
  return `${dateFormatter.format(new Date(iso))} UTC`;
}

export function InvitationManager({ initialInvitations, issue, revoke }: Props) {
  const [issueState, issueFormAction, issuePending] = useActionState(issue, {
    status: "idle",
  } satisfies IssueInvitationState);
  const [revokeState, revokeFormAction, revokePending] = useActionState(revoke, {
    status: "idle",
  } satisfies RevokeInvitationState);
  const [dismissedCode, setDismissedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const copyButtonRef = useRef<HTMLButtonElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const visibleCode =
    issueState.status === "success" && issueState.code !== dismissedCode
      ? issueState.code
      : null;

  useEffect(() => {
    if (issueState.status !== "success") return;
    setCopied(false);
    setCopyFailed(false);
    copyButtonRef.current?.focus();
  }, [issueState]);

  useEffect(() => {
    if (revokeState.status !== "idle") setConfirmingId(null);
  }, [revokeState]);

  async function copyCode(code: string) {
    try {
      if (!navigator.clipboard) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setCopyFailed(false);
    } catch {
      setCopied(false);
      setCopyFailed(true);
    }
  }

  function dismissCode() {
    if (issueState.status === "success") setDismissedCode(issueState.code);
    setCopied(false);
    setCopyFailed(false);
    submitButtonRef.current?.focus();
  }

  return (
    <div className="invitations">
      <section aria-labelledby="issue-invitation-title" className="invitation-panel">
        <h2 className="invitation-panel-title" id="issue-invitation-title">
          Issue an invitation
        </h2>
        <p className="invitation-panel-lead">
          Codes are shown once. Send one to a trusted person; it stops working when it
          expires, is fully used, or is revoked.
        </p>

        <form action={issueFormAction} className="auth-form">
          <div className="invitation-fields">
            <div className="field">
              <label htmlFor="invitation-expiry">Expires after</label>
              <select defaultValue="7" id="invitation-expiry" name="expiryDays">
                <option value="1">1 day</option>
                <option value="7">7 days</option>
                <option value="30">30 days</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="invitation-max-uses">Use limit</label>
              <input
                aria-describedby="invitation-max-uses-hint"
                defaultValue="1"
                id="invitation-max-uses"
                max="100"
                min="1"
                name="maxUses"
                required
                step="1"
                type="number"
              />
              <p className="field-hint" id="invitation-max-uses-hint">
                1 to 100 accounts.
              </p>
            </div>
          </div>

          <button
            className="primary-button"
            disabled={issuePending}
            ref={submitButtonRef}
            type="submit"
          >
            {issuePending ? "Creating…" : "Create invitation"}
          </button>
        </form>

        <div aria-live="polite">
          {issueState.status === "error" ? (
            <p className="form-status error" role="alert">
              {issueState.message}
            </p>
          ) : null}

          {visibleCode ? (
            <fieldset className="invitation-code-panel">
              <legend className="invitation-code-label">New invitation code</legend>
              <code className="invitation-code">{visibleCode}</code>
              <p className="field-hint" id="issued-code-hint">
                This code is not shown again. Copy it now and share it privately.
              </p>
              <div className="invitation-code-actions">
                <button
                  aria-describedby="issued-code-hint"
                  className="primary-button"
                  onClick={() => copyCode(visibleCode)}
                  ref={copyButtonRef}
                  type="button"
                >
                  {copied ? "Copied" : "Copy code"}
                </button>
                <button className="secondary-button" onClick={dismissCode} type="button">
                  Dismiss
                </button>
              </div>
              {copyFailed ? (
                <p className="form-status error" role="alert">
                  Could not copy automatically. Select the code and copy it manually.
                </p>
              ) : null}
            </fieldset>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="invitation-list-title" className="invitation-panel">
        <h2 className="invitation-panel-title" id="invitation-list-title">
          Your invitations
        </h2>

        <div aria-live="polite">
          {revokeState.status === "error" ? (
            <p className="form-status error" role="alert">
              {revokeState.message}
            </p>
          ) : null}
          {revokeState.status === "success" ? (
            <p className="form-status info" role="status">
              {revokeState.message}
            </p>
          ) : null}
        </div>

        {initialInvitations.length === 0 ? (
          <p className="invitation-empty">
            You have not issued any invitations yet. Create one above to invite someone.
          </p>
        ) : (
          <ul className="invitation-list">
            {initialInvitations.map((invitation) => (
              <li key={invitation.id}>
                <article
                  aria-labelledby={`invitation-${invitation.id}-title`}
                  className="invitation-card"
                >
                  <header className="invitation-card-header">
                    <h3
                      className="invitation-card-title"
                      id={`invitation-${invitation.id}-title`}
                    >
                      Invitation
                    </h3>
                    <span className={`invitation-status status-${invitation.status}`}>
                      {statusLabels[invitation.status]}
                    </span>
                  </header>

                  <dl className="invitation-facts">
                    <div>
                      <dt>Created</dt>
                      <dd>
                        <time dateTime={invitation.createdAt}>
                          {formatDate(invitation.createdAt)}
                        </time>
                      </dd>
                    </div>
                    <div>
                      <dt>Expires</dt>
                      <dd>
                        <time dateTime={invitation.expiresAt}>
                          {formatDate(invitation.expiresAt)}
                        </time>
                      </dd>
                    </div>
                    <div>
                      <dt>Uses</dt>
                      <dd>
                        {invitation.useCount} of {invitation.maxUses}
                      </dd>
                    </div>
                  </dl>

                  {invitation.status === "available" ? (
                    <form action={revokeFormAction} className="invitation-revoke-form">
                      <input name="invitationId" type="hidden" value={invitation.id} />
                      {confirmingId === invitation.id ? (
                        <>
                          <p className="invitation-confirm" role="status">
                            Revoke this invitation? It will stop working immediately.
                          </p>
                          <button
                            className="danger-button"
                            disabled={revokePending}
                            ref={(node) => {
                              node?.focus();
                            }}
                            type="submit"
                          >
                            {revokePending ? "Revoking…" : "Confirm revoke"}
                          </button>
                          <button
                            className="secondary-button"
                            onClick={() => setConfirmingId(null)}
                            type="button"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          className="secondary-button"
                          onClick={() => setConfirmingId(invitation.id)}
                          type="button"
                        >
                          Revoke
                        </button>
                      )}
                    </form>
                  ) : null}
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
