import { closeDatabase, getSqlClient } from "../src/db/client";
import { auth } from "../src/lib/auth";

type ConstraintError = Error & {
  constraint_name?: string;
};

async function expectConstraint(
  expected: string,
  operation: () => Promise<unknown>,
): Promise<void> {
  try {
    await operation();
  } catch (error) {
    if ((error as ConstraintError).constraint_name === expected) return;
    throw error;
  }
  throw new Error(`expected PostgreSQL constraint ${expected} to reject the operation`);
}

const sql = getSqlClient();
const suffix = crypto.randomUUID();
const firstUserId = `persistence-first-${suffix}`;
const secondUserId = `persistence-second-${suffix}`;
const firstEmail = `first-${suffix}@example.test`;
const secondEmail = `second-${suffix}@example.test`;
const handle = `test_${suffix.replaceAll("-", "").slice(0, 16)}`;

try {
  await auth.api.getSession({ headers: new Headers() });

  let signUpRejected = false;
  try {
    await auth.api.signUpEmail({
      body: {
        email: `public-signup-${suffix}@example.test`,
        name: "Public Signup Must Fail",
        password: "test-password-that-is-never-logged",
      },
    });
  } catch {
    signUpRejected = true;
  }
  if (!signUpRejected) throw new Error("public email/password signup is enabled");

  await sql`
    insert into users (id, name, email, email_verified)
    values (${firstUserId}, 'First Test User', ${firstEmail}, true)
  `;
  await sql`insert into members (user_id) values (${firstUserId})`;
  await sql`
    insert into profiles (user_id, handle, public_name)
    values (${firstUserId}, ${handle}, 'First Test User')
  `;

  await sql`update profiles set bio = 'Mutable bio' where user_id = ${firstUserId}`;
  const [updatedProfile] = await sql<
    { bio: string }[]
  >`select bio from profiles where user_id = ${firstUserId}`;
  if (updatedProfile?.bio !== "Mutable bio") {
    throw new Error("mutable profile fields did not update");
  }

  await expectConstraint(
    "profiles_handle_immutable",
    () =>
      sql`update profiles set handle = ${`${handle}_new`} where user_id = ${firstUserId}`,
  );

  await sql`
    insert into users (id, name, email, email_verified)
    values (${secondUserId}, 'Second Test User', ${secondEmail}, true)
  `;
  await sql`insert into members (user_id) values (${secondUserId})`;

  await expectConstraint(
    "profiles_handle_unique",
    () =>
      sql`
      insert into profiles (user_id, handle, public_name)
      values (${secondUserId}, ${handle}, 'Duplicate Handle')
    `,
  );

  await expectConstraint(
    "profiles_handle_normalized",
    () =>
      sql`
      insert into profiles (user_id, handle, public_name)
      values (${secondUserId}, 'UPPER_case', 'Uppercase Handle')
    `,
  );

  await expectConstraint(
    "members_user_id_users_id_fk",
    () => sql`insert into members (user_id) values (${`missing-${suffix}`})`,
  );

  process.stdout.write("persistence invariants: ok\n");
} finally {
  await sql`delete from users where id in (${firstUserId}, ${secondUserId})`;
  await closeDatabase();
}
