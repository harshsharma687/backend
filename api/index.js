// Vercel serverless entry point. Everything is loaded lazily inside the
// handler and every failure mode returns readable JSON — an opaque
// FUNCTION_INVOCATION_FAILED tells us nothing, but a JSON error with the real
// message and stack pinpoints the problem instantly from any browser.
//
// env check  -> { error: "ENV_MISSING", ... }
// import err -> { error: "INIT_FAILED", message + stack }
// db fail    -> { error: "DB_UNREACHABLE", ... }
// route err  -> { error: "HANDLER_FAILED", message + stack }

const REQUIRED_ENV = [
  "MONGODB_URI",
  "ACCESS_TOKEN_SECRET",
  "REFRESH_TOKEN_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

let cached = null;

async function loadApp() {
  if (cached) return cached;
  const [{ app }, { default: connectToDatabase }] = await Promise.all([
    import("../src/app.js"),
    import("../src/db/index.js"),
  ]);
  cached = { app, connectToDatabase };
  return cached;
}

export default async function handler(req, res) {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length) {
    return res.status(500).json({
      error: "ENV_MISSING",
      message: `Set these in Vercel → Settings → Environment Variables, then redeploy: ${missing.join(", ")}`,
    });
  }

  let app;
  let connectToDatabase;
  try {
    ({ app, connectToDatabase } = await loadApp());
  } catch (error) {
    return res.status(500).json({
      error: "INIT_FAILED",
      message: error?.message || String(error),
      stack: (error?.stack || "").split("\n").slice(0, 12),
    });
  }

  try {
    await connectToDatabase();
  } catch (error) {
    return res.status(503).json({
      error: "DB_UNREACHABLE",
      message: error?.message || String(error),
      hint: "Check MONGODB_URI and the Atlas Network Access allowlist (0.0.0.0/0).",
    });
  }

  try {
    return await app(req, res);
  } catch (error) {
    return res.status(500).json({
      error: "HANDLER_FAILED",
      path: req.url,
      message: error?.message || String(error),
      stack: (error?.stack || "").split("\n").slice(0, 12),
    });
  }
}
