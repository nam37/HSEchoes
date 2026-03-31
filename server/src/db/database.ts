import postgres from "postgres";

export type Sql = ReturnType<typeof postgres>;

export function createDatabase(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is not set.");
  }
  return postgres(url);
}

export async function ensureSchema(sql: Sql): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS world_data (
      kind TEXT NOT NULL,
      id   TEXT NOT NULL,
      json TEXT NOT NULL,
      PRIMARY KEY (kind, id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS runs (
      slot_id    TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL DEFAULT '',
      json       TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `;
  // Migrations
  await sql`ALTER TABLE runs ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE runs ADD COLUMN IF NOT EXISTS checkpoint_json TEXT`;
  await sql`
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id    TEXT PRIMARY KEY,
      email      TEXT UNIQUE NOT NULL,
      role       TEXT NOT NULL DEFAULT 'player',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `;
}
