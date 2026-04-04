import { pathToFileURL } from "node:url";
import { worldSeed } from "../content/world.js";
import { createDatabase } from "./database.js";
import type { Sql } from "./database.js";

export async function seedDatabase(sql: Sql): Promise<void> {
  await sql`DELETE FROM world_data`;

  await sql`
    INSERT INTO world_data (kind, id, json)
    VALUES ('meta', 'bootstrap', ${JSON.stringify({
      title: worldSeed.title,
      intro: worldSeed.intro,
      startX: worldSeed.startX,
      startY: worldSeed.startY,
      assets: worldSeed.assets
    })})
  `;

  await sql`INSERT INTO world_data (kind, id, json) VALUES ('zone', ${worldSeed.zone.id}, ${JSON.stringify(worldSeed.zone)})`;

  for (const item of worldSeed.items) {
    await sql`INSERT INTO world_data (kind, id, json) VALUES ('item', ${item.id}, ${JSON.stringify(item)})`;
  }
  for (const enemy of worldSeed.enemies) {
    await sql`INSERT INTO world_data (kind, id, json) VALUES ('enemy', ${enemy.id}, ${JSON.stringify(enemy)})`;
  }
  for (const encounter of worldSeed.encounters) {
    await sql`INSERT INTO world_data (kind, id, json) VALUES ('encounter', ${encounter.id}, ${JSON.stringify(encounter)})`;
  }
  for (const quest of worldSeed.quests) {
    await sql`INSERT INTO world_data (kind, id, json) VALUES ('quest', ${quest.id}, ${JSON.stringify(quest)})`;
  }
  for (const message of worldSeed.messages) {
    await sql`INSERT INTO world_data (kind, id, json) VALUES ('message', ${message.id}, ${JSON.stringify(message)})`;
  }
  for (const npc of worldSeed.npcs) {
    await sql`INSERT INTO world_data (kind, id, json) VALUES ('npc', ${npc.id}, ${JSON.stringify(npc)})`;
  }
  for (const terminal of worldSeed.terminals) {
    await sql`INSERT INTO world_data (kind, id, json) VALUES ('terminal', ${terminal.id}, ${JSON.stringify(terminal)})`;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { ensureSchema } = await import("./database.js");
  const sql = createDatabase();
  await ensureSchema(sql);
  await seedDatabase(sql);
  await sql.end();
  console.log("Seeded zone world content into Neon DB.");
}
