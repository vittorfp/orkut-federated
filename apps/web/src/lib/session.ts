import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDatabase } from "@/db/client";
import { members, profiles } from "@/db/schema";
import { getAuth } from "./auth";

export type ActiveMember = {
  handle: string;
  publicName: string;
  userId: string;
};

export async function findActiveMember(userId: string): Promise<ActiveMember | null> {
  const [row] = await getDatabase()
    .select({
      handle: profiles.handle,
      publicName: profiles.publicName,
      status: members.status,
      userId: members.userId,
    })
    .from(members)
    .innerJoin(profiles, eq(profiles.userId, members.userId))
    .where(eq(members.userId, userId))
    .limit(1);

  if (row?.status !== "active") return null;
  return { handle: row.handle, publicName: row.publicName, userId: row.userId };
}

export type CurrentMember = ActiveMember & {
  email: string;
  sessionId: string;
};

export async function getCurrentMember(): Promise<CurrentMember | null> {
  const session = await getAuth().api.getSession({
    headers: new Headers(await headers()),
  });
  if (!session) return null;

  const member = await findActiveMember(session.user.id);
  if (!member) return null;

  return {
    ...member,
    email: session.user.email,
    sessionId: session.session.id,
  };
}

export async function requireMember(): Promise<CurrentMember> {
  const member = await getCurrentMember();
  if (!member) redirect("/login");
  return member;
}
