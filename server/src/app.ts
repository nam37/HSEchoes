import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { createDatabase } from "./db/database.js";
import { GameService } from "./services/gameService.js";
import { registerGameRoutes } from "./routes/gameRoutes.js";

const clientDistRoot = path.resolve(process.cwd(), "dist", "client");
const clientAssetRoot = path.join(clientDistRoot, "assets");
const clientIndexPath = path.join(clientDistRoot, "index.html");

export function buildApp(dbFile?: string): FastifyInstance {
  const db = createDatabase(dbFile);
  const app = Fastify({ logger: false });
  const game = new GameService(db);

  app.decorate("gameService", game);
  app.register(registerGameRoutes);

  app.get("/", async (_request, reply) => {
    if (await fileExists(clientIndexPath)) {
      const html = await readFile(clientIndexPath, "utf8");
      reply.type("text/html; charset=utf-8").send(html);
      return;
    }

    reply.type("text/html; charset=utf-8").send(renderDevLanding());
  });

  app.get<{ Params: { "*": string } }>("/assets/*", async (request, reply) => {
    const assetPath = request.params["*"];
    const candidate = path.resolve(clientAssetRoot, assetPath);

    if (!candidate.startsWith(clientAssetRoot) || !(await isFile(candidate))) {
      reply.code(404).send({ ok: false, error: "Asset not found." });
      return;
    }

    const content = await readFile(candidate);
    reply.type(contentTypeFor(candidate)).send(content);
  });

  app.setErrorHandler((error, _request, reply) => {
    reply.code(500).send({ ok: false, error: error instanceof Error ? error.message : "Unknown server error" });
  });
  app.addHook("onClose", async () => {
    db.close();
  });
  return app;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function isFile(filePath: string): Promise<boolean> {
  try {
    const details = await stat(filePath);
    return details.isFile();
  } catch {
    return false;
  }
}

function contentTypeFor(filePath: string): string {
  switch (path.extname(filePath).toLowerCase()) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".svg":
      return "image/svg+xml";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

function renderDevLanding(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Echoes of the Hollow Star</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: "Lucida Console", "Courier New", monospace;
        background: linear-gradient(180deg, #120d11 0%, #09070a 100%);
        color: #efe5cf;
      }
      main {
        width: min(42rem, calc(100vw - 2rem));
        padding: 2rem;
        border: 1px solid rgba(212, 163, 102, 0.36);
        background: rgba(25, 19, 23, 0.92);
        box-shadow: 0 20px 45px rgba(0, 0, 0, 0.35);
      }
      a {
        color: #f0c27d;
      }
      code {
        color: #f0c27d;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Echoes of the Hollow Star</h1>
      <p>The Fastify backend is running, but no built client was found at <code>dist/client</code>.</p>
      <p>For development, open <a href="http://localhost:5173">http://localhost:5173</a>.</p>
      <p>For backend-served play, run <code>npm run build</code> first and reload this page.</p>
    </main>
  </body>
</html>`;
}

declare module "fastify" {
  interface FastifyInstance {
    gameService: GameService;
  }
}

