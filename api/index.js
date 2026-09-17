// Vercel serverless entry point. Vercel imports this default handler for the
// /api/* routes (see vercel.json rewrites) and passes each request through the
// full Express app — routes, auth, uploads, static assets, everything.
import { app } from "../src/app.js";
import connectToDatabase from "../src/db/index.js";

// Fail fast with a readable JSON message instead of a cryptic
// FUNCTION_INVOCATION_FAILED when environment variables are missing on a
// fresh deployment.
const REQUIRED_ENV = [
  "MONGODB_URI",
  "ACCESS_TOKEN_SECRET",
  "REFRESH_TOKEN_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

// On the local Node server (src/index.js) connectToDatabase() runs before
// listen(). Serverless has no such startup step, so every invocation ensures
// the connection itself. Mongoose caches the connection, so this is a cheap
// no-op once warm.
let ready = null;
const ensureDatabase = () => (ready ??= connectToDatabase());

export default async function handler(req, res) {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length) {
    return res.status(500).json({
      success: false,
      message: `Server misconfigured: missing environment variables: ${missing.join(", ")}. Set them in Vercel → Settings → Environment Variables, then redeploy.`,
    });
  }

  try {
    await ensureDatabase();
  } catch (error) {
    console.error("Database unavailable:", error?.message || error);
    return res.status(503).json({
      success: false,
      message: "Database is not reachable. Check MONGODB_URI and the Atlas IP allowlist (0.0.0.0/0).",
    });
  }
  return app(req, res);
}
