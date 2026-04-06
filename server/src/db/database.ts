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
      slot_index INTEGER,
      json       TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `;
  // Migrations
  await sql`ALTER TABLE runs ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE runs ADD COLUMN IF NOT EXISTS slot_index INTEGER`;
  await sql`ALTER TABLE runs ADD COLUMN IF NOT EXISTS checkpoint_json TEXT`;
  await sql`
    WITH ranked AS (
      SELECT
        slot_id,
        ROW_NUMBER() OVER (
          PARTITION BY user_id
          ORDER BY updated_at DESC, created_at DESC, slot_id DESC
        ) AS slot_number
      FROM runs
      WHERE slot_index IS NULL
    )
    DELETE FROM runs
    WHERE slot_id IN (
      SELECT slot_id FROM ranked WHERE slot_number > 3
    )
  `;
  await sql`
    WITH ranked AS (
      SELECT
        slot_id,
        ROW_NUMBER() OVER (
          PARTITION BY user_id
          ORDER BY updated_at DESC, created_at DESC, slot_id DESC
        ) AS slot_number
      FROM runs
      WHERE slot_index IS NULL
    )
    UPDATE runs
    SET slot_index = ranked.slot_number
    FROM ranked
    WHERE runs.slot_id = ranked.slot_id
  `;
  await sql`DELETE FROM runs WHERE slot_index IS NOT NULL AND (slot_index < 1 OR slot_index > 3)`;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS runs_user_slot_unique_idx
    ON runs (user_id, slot_index)
    WHERE slot_index IS NOT NULL
  `;
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
