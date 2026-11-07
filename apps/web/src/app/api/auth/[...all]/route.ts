import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

let handlers: ReturnType<typeof toNextJsHandler> | undefined;

function getHandlers(): ReturnType<typeof toNextJsHandler> {
  handlers ??= toNextJsHandler(getAuth());
  return handlers;
}

export function GET(request: Request): Promise<Response> {
  return getHandlers().GET(request);
}

export function POST(request: Request): Promise<Response> {
  return getHandlers().POST(request);
}
