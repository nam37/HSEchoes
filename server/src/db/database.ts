import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

export interface WorldRow {
  kind: string;
  id: string;
  json: string;
}

export function createDatabase(dbFile = path.resolve(process.cwd(), "data", "game.sqlite")): Database.Database {
  mkdirSync(path.dirname(dbFile), { recursive: true });
  const db = new Database(dbFile);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS world_data (
      kind TEXT NOT NULL,
      id TEXT NOT NULL,
      json TEXT NOT NULL,
      PRIMARY KEY (kind, id)
    );

    CREATE TABLE IF NOT EXISTS runs (
      slot_id TEXT PRIMARY KEY,
      json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  return db;
}
