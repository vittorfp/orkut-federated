import { checkReadiness } from "@/lib/health";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const readiness = await checkReadiness();
  return Response.json(readiness, {
    status: readiness.status === "ready" ? 200 : 503,
  });
}
