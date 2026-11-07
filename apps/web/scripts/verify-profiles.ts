import { closeDatabase, getSqlClient } from "../src/db/client";
import { findPublicProfileByHandle } from "../src/domain/profiles/service";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const sql = getSqlClient();
const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
const memberId = `profile-member-${suffix}`;
const suspendedId = `profile-suspended-${suffix}`;
const deletedId = `profile-deleted-${suffix}`;
const handle = `profile_${suffix}`;

async function createMember(id: string, status: string, memberHandle: string) {
  await sql`
    insert into users (id, name, email, email_verified)
    values (${id}, ${`Profile ${status}`}, ${`${id}@example.test`}, true)
  `;
  await sql`insert into members (user_id, status) values (${id}, ${status})`;
  await sql`
    insert into profiles (user_id, handle, public_name, bio, location, interests)
    values (
      ${id},
      ${memberHandle},
      'Public Person',
      'A public bio',
      'Sao Paulo',
      ARRAY['federation', 'scraps']
    )
  `;
}

try {
  await createMember(memberId, "active", handle);
  await createMember(suspendedId, "suspended", `${handle}_susp`);
  await createMember(deletedId, "deleted", `${handle}_del`);

  const profile = await findPublicProfileByHandle(`  ${handle.toUpperCase()}  `);
  assert(profile, "active public profile was not found");
  assert(profile.handle === handle, "handle was not normalized");
  assert(profile.publicName === "Public Person", "public name was not projected");
  assert(profile.bio === "A public bio", "bio was not projected");
  assert(profile.location === "Sao Paulo", "location was not projected");
  assert(profile.interests.length === 2, "interests were not projected");
  const serialized = JSON.stringify(profile);
  assert(!serialized.includes("@example.test"), "public profile leaked an email");
  assert(!serialized.includes(memberId), "public profile leaked a user identifier");

  assert(
    (await findPublicProfileByHandle(`${handle}_susp`)) === null,
    "suspended profile was public",
  );
  assert(
    (await findPublicProfileByHandle(`${handle}_del`)) === null,
    "deleted profile was public",
  );
  assert(
    (await findPublicProfileByHandle("admin")) === null,
    "reserved handle resolved a profile",
  );
  assert(
    (await findPublicProfileByHandle("not a handle")) === null,
    "invalid handle resolved a profile",
  );
  assert(
    (await findPublicProfileByHandle(`missing_${suffix}`)) === null,
    "missing profile resolved",
  );

  process.stdout.write("public profile invariants: ok\n");
} finally {
  await sql`delete from users where id in (${memberId}, ${suspendedId}, ${deletedId})`;
  await closeDatabase();
}
