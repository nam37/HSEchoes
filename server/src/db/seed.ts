import { pathToFileURL } from "node:url";
import type Database from "better-sqlite3";
import { worldSeed } from "../content/world.js";
import { createDatabase } from "./database.js";

export function seedDatabase(db: Database.Database): void {
  const wipe = db.prepare("DELETE FROM world_data");
  wipe.run();

  const insert = db.prepare("INSERT INTO world_data (kind, id, json) VALUES (?, ?, ?)");
  const transaction = db.transaction(() => {
    insert.run("meta", "bootstrap", JSON.stringify({
      title: worldSeed.title,
      intro: worldSeed.intro,
      startCellId: worldSeed.startCellId,
      assets: worldSeed.assets
    }));

    for (const cell of worldSeed.cells) {
      insert.run("cell", cell.id, JSON.stringify(cell));
    }
    for (const item of worldSeed.items) {
      insert.run("item", item.id, JSON.stringify(item));
    }
    for (const enemy of worldSeed.enemies) {
      insert.run("enemy", enemy.id, JSON.stringify(enemy));
    }
    for (const encounter of worldSeed.encounters) {
      insert.run("encounter", encounter.id, JSON.stringify(encounter));
    }
  });

  transaction();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const db = createDatabase();
  seedDatabase(db);
  db.close();
  console.log("Seeded SQLite content at data/game.sqlite");
}
