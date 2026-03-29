/**
 * Grant admin role to a user by email.
 * The user must have signed in at least once before running this.
 *
 * Usage:
 *   npm run db:grant-admin -- nam037@gmail.com
 *   npm run db:grant-admin -- user@example.com player   (to demote)
 */
import { createDatabase } from "../db/database.js";

const [email, role = "admin"] = process.argv.slice(2);

if (!email) {
  console.error("Usage: npm run db:grant-admin -- <email> [role]");
  process.exit(1);
}

if (!["admin", "player"].includes(role)) {
  console.error("Role must be 'admin' or 'player'.");
  process.exit(1);
}

const sql = createDatabase();

try {
  const rows = await sql<Array<{ user_id: string; email: string; role: string }>>`
    SELECT user_id, email, role FROM user_profiles WHERE email = ${email.toLowerCase()}
  `;

  if (rows.length === 0) {
    console.error(`No user found with email '${email}'. They must sign in at least once first.`);
    process.exit(1);
  }

  const user = rows[0];
  const now = new Date().toISOString();
  await sql`
    UPDATE user_profiles SET role = ${role}, updated_at = ${now} WHERE user_id = ${user.user_id}
  `;

  console.log(`✓ ${user.email} (${user.user_id}) → role set to '${role}'`);
} finally {
  await sql.end();
}
