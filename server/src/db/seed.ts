import { pathToFileURL } from "node:url";
import { worldSeed } from "../content/world.js";
import { createDatabase } from "./database.js";
import type { Sql } from "./database.js";

export async function seedDatabase(sql: Sql): Promise<void> {
  await sql`DELETE FROM world_data`;

  await sql.begin(async (tx) => {
    await tx`
      INSERT INTO world_data (kind, id, json)
      VALUES ('meta', 'bootstrap', ${JSON.stringify({
        title: worldSeed.title,
        intro: worldSeed.intro,
        startCellId: worldSeed.startCellId,
        assets: worldSeed.assets
      })})
    `;

    for (const cell of worldSeed.cells) {
      await tx`INSERT INTO world_data (kind, id, json) VALUES ('cell', ${cell.id}, ${JSON.stringify(cell)})`;
    }
    for (const item of worldSeed.items) {
      await tx`INSERT INTO world_data (kind, id, json) VALUES ('item', ${item.id}, ${JSON.stringify(item)})`;
    }
    for (const enemy of worldSeed.enemies) {
      await tx`INSERT INTO world_data (kind, id, json) VALUES ('enemy', ${enemy.id}, ${JSON.stringify(enemy)})`;
    }
    for (const encounter of worldSeed.encounters) {
      await tx`INSERT INTO world_data (kind, id, json) VALUES ('encounter', ${encounter.id}, ${JSON.stringify(encounter)})`;
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { ensureSchema } = await import("./database.js");
  const sql = createDatabase();
  await ensureSchema(sql);
  await seedDatabase(sql);
  await sql.end();
  console.log("Seeded world content into Neon DB.");
}
