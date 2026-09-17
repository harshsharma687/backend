// Vercel serverless entry point. Vercel imports this default handler for the
// /api/* routes (see vercel.json rewrite) and passes each request through the
// full Express app — routes, auth, uploads, everything.
import { app } from "../src/app.js";
import connectToDatabase from "../src/db/index.js";

// On the local Node server (src/index.js) connectToDatabase() runs before
// listen(). Serverless has no such startup step, so every invocation ensures
// the connection itself. Mongoose caches the connection, so this is a cheap
// no-op once warm — and it must complete before the first DB-touching route.
let ready = null;
const ensureDatabase = () => (ready ??= connectToDatabase());

export default async function handler(req, res) {
  try {
    await ensureDatabase();
  } catch (error) {
    // connectToDatabase retries 5x then process.exit(1) — in serverless we
    // surface the failure as JSON instead of killing the lambda.
    console.error("Database unavailable:", error?.message || error);
    return res.status(503).json({
      success: false,
      message: "Database is not reachable. Check MONGODB_URI and the Atlas IP allowlist (0.0.0.0/0).",
    });
  }
  return app(req, res);
}
