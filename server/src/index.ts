import { ensureSchema } from "./db/database.js";
import { createDatabase } from "./db/database.js";
import { buildApp } from "./app.js";

const sql = createDatabase();
await ensureSchema(sql);
await sql.end();

const app = await buildApp();
const port = Number(process.env.PORT ?? 8787);

app.listen({ port, host: "0.0.0.0" }).then(() => {
  console.log(`Echoes of the Hollow Star server listening on http://localhost:${port}`);
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
