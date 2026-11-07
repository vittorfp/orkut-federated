import { and, eq } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { members, profiles } from "@/db/schema";
import { validateHandle } from "@/domain/handles";

export type PublicProfile = {
  bio: string;
  createdAt: Date;
  handle: string;
  interests: string[];
  location: string | null;
  publicName: string;
};

/**
 * Reads the public profile projection. Suspended and deleted members are
 * hidden even though their Better Auth principal may still exist.
 */
export async function findPublicProfileByHandle(
  input: string,
): Promise<PublicProfile | null> {
  const validation = validateHandle(input);
  if (!validation.valid) return null;

  const [profile] = await getDatabase()
    .select({
      bio: profiles.bio,
      createdAt: profiles.createdAt,
      handle: profiles.handle,
      interests: profiles.interests,
      location: profiles.location,
      publicName: profiles.publicName,
    })
    .from(profiles)
    .innerJoin(members, eq(members.userId, profiles.userId))
    .where(and(eq(profiles.handle, validation.handle), eq(members.status, "active")))
    .limit(1);

  return profile ?? null;
}
