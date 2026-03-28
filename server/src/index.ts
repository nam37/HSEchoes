import { seedDatabase } from "./db/seed.js";
import { buildApp } from "./app.js";
import { createDatabase } from "./db/database.js";

const db = createDatabase();
seedDatabase(db);
db.close();

const app = buildApp();
const port = Number(process.env.PORT ?? 8787);

app.listen({ port, host: "0.0.0.0" }).then(() => {
  console.log(`Echoes of the Hollow Star server listening on http://localhost:${port}`);
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
