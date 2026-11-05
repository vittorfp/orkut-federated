const HANDLE_PATTERN = /^[a-z][a-z0-9_]{2,29}$/;

const RESERVED_HANDLES = new Set([
  "about",
  "admin",
  "api",
  "auth",
  "communities",
  "community",
  "help",
  "inbox",
  "moderation",
  "nodeinfo",
  "root",
  "security",
  "settings",
  "support",
  "system",
  "users",
  "webfinger",
]);

export type HandleValidation =
  | { valid: true; handle: string }
  | { valid: false; reason: "format" | "reserved" };

export function validateHandle(input: string): HandleValidation {
  const handle = input.trim().toLowerCase();
  if (!HANDLE_PATTERN.test(handle)) return { valid: false, reason: "format" };
  if (RESERVED_HANDLES.has(handle)) return { valid: false, reason: "reserved" };
  return { valid: true, handle };
}
