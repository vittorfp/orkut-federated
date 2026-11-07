import { closeDatabase } from "../src/db/client";
import { pruneSecurityData } from "../src/lib/security-maintenance";

const retentionArg = process.argv.find((arg) => arg.startsWith("--days="));
const auditRetentionDays = retentionArg
  ? Number(retentionArg.slice("--days=".length))
  : undefined;

try {
  const result = await pruneSecurityData({ auditRetentionDays });
  process.stdout.write(
    `security data pruned: ${result.auditEvents} audit events, ${result.rateLimitCounters} rate-limit counters\n`,
  );
} finally {
  await closeDatabase();
}
