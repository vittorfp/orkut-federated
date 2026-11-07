import { closeDatabase } from "../src/db/client";
import { revokeActiveInvitations } from "../src/domain/invitations/operator";

const args = process.argv.slice(2);
const inviterIndex = args.indexOf("--inviter");
const inviterUserId = inviterIndex >= 0 ? args[inviterIndex + 1] : undefined;
const all = args.includes("--all");
const confirmed = args.includes("--confirm");

if (!confirmed) {
  process.stderr.write(
    "Refusing to revoke invitations without --confirm. Use --all or --inviter <user-id>.\n",
  );
  process.exitCode = 1;
} else if (!all && !inviterUserId) {
  process.stderr.write("Specify --all or --inviter <user-id>.\n");
  process.exitCode = 1;
} else if (all && inviterUserId) {
  process.stderr.write("Choose either --all or --inviter, not both.\n");
  process.exitCode = 1;
} else {
  try {
    const revoked = await revokeActiveInvitations({ inviterUserId });
    process.stdout.write(
      `revoked ${revoked} active invitation${revoked === 1 ? "" : "s"}\n`,
    );
  } finally {
    await closeDatabase();
  }
}
