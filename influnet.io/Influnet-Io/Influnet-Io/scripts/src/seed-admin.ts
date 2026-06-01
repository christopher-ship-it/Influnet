import { db, usersTable, businessProfilesTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function main() {
  const email = "kamalesh@tecstellar.com";

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (existing) {
    console.log("Admin user already exists — skipping seed.");
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash("admin", 12);

  const [user] = await db
    .insert(usersTable)
    .values({
      email,
      passwordHash,
      name: "Kamalesh",
      role: "admin",
      status: "active",
    })
    .returning({ id: usersTable.id });

  await db.insert(businessProfilesTable).values({
    userId: user.id,
    companyName: "Tecstellar",
    contactName: "Kamalesh",
  });

  console.log(`Admin user created: ${email} / admin`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
