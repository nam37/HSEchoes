import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { createDatabase } from "./db/database.js";
import type { Sql } from "./db/database.js";
import { GameService } from "./services/gameService.js";
import { registerGameRoutes } from "./routes/gameRoutes.js";
import { registerAdminRoutes } from "./routes/adminRoutes.js";
import { registerAuthProxy } from "./routes/authProxy.js";

const clientDistRoot = path.resolve(process.cwd(), "dist", "client");
const clientAssetRoot = path.join(clientDistRoot, "assets");
const clientIndexPath = path.join(clientDistRoot, "index.html");

export async function buildApp(): Promise<FastifyInstance> {
  const sql = createDatabase();
  const app = Fastify({ logger: false });
  const game = await GameService.create(sql);

  app.decorate("gameService", game);
  app.decorate("sql", sql);
  app.register(registerAuthProxy);
  app.register(registerGameRoutes);
  app.register(registerAdminRoutes);

  // Serve built client assets
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

  // Serve root-level public files (fonts, images copied from client/public/)
  const STATIC_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".svg", ".ico", ".ttf", ".otf", ".woff", ".woff2"]);
  app.get<{ Params: { file: string } }>("/:file", async (request, reply) => {
    const file = request.params.file;
    const ext = path.extname(file).toLowerCase();
    if (!STATIC_EXTS.has(ext)) { return; } // not a static file — let other routes handle
    const candidate = path.resolve(clientDistRoot, file);
    if (!candidate.startsWith(clientDistRoot) || !(await isFile(candidate))) {
      reply.code(404).send({ ok: false, error: "Not found." });
      return;
    }
    reply.header("Cache-Control", "public, max-age=31536000, immutable");
    reply.type(contentTypeFor(candidate)).send(await readFile(candidate));
  });

  // SPA shell — serve index.html for routes the React client handles
  async function serveSpa(_req: unknown, reply: import("fastify").FastifyReply): Promise<void> {
    if (await fileExists(clientIndexPath)) {
      const html = await readFile(clientIndexPath, "utf8");
      reply.type("text/html; charset=utf-8").send(html);
      return;
    }
    reply.type("text/html; charset=utf-8").send(renderDevLanding());
  }
  app.get("/", serveSpa);
  app.get("/admin", serveSpa);

  app.setErrorHandler((error, _request, reply) => {
    reply.code(500).send({ ok: false, error: error instanceof Error ? error.message : "Unknown server error" });
  });

  app.addHook("onClose", async () => {
    await sql.end();
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
    case ".ttf":
      return "font/ttf";
    case ".otf":
      return "font/otf";
    case ".woff":
      return "font/woff";
    case ".woff2":
      return "font/woff2";
    case ".ico":
      return "image/x-icon";
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
        background: linear-gradient(180deg, #000814 0%, #000509 100%);
        color: #a8d8f0;
      }
      main {
        width: min(42rem, calc(100vw - 2rem));
        padding: 2rem;
        border: 1px solid rgba(0, 180, 240, 0.25);
        background: rgba(2, 8, 22, 0.93);
      }
      a, code { color: #00d4ff; }
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
    sql: Sql;
  }
}
