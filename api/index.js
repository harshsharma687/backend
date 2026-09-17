// Vercel serverless entry point. Lazily loads the Express app + DB connector
// and converts every failure mode into readable JSON instead of an opaque
// FUNCTION_INVOCATION_FAILED.
//
// Note: rewrites preserve the ORIGINAL request path, so req.url arrives as
// e.g. "/api/v1/posts" and the Express app routes it directly. Never mutate
// req.url here.
//
// Vercel's runtime sometimes resolves a request's entry module to
// src/app.js itself (see "Invalid export found in module /var/task/src/app.js"
// in runtime logs). src/app.js therefore also exports the app as its default —
// so whichever module the runtime enters through, the handler is valid.

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
  if (typeof app !== "function") {
    throw new Error(`src/app.js did not export a callable app (got ${typeof app})`);
  }
  cached = { app, connectToDatabase };
  return cached;
}

const fail = (res, status, error, extra = {}) =>
  res.status(status).json({ error, ...extra });

export default async function handler(req, res) {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length) {
    return fail(res, 500, "ENV_MISSING", {
      message: `Set these in Vercel → Settings → Environment Variables, then redeploy: ${missing.join(", ")}`,
    });
  }

  let app;
  let connectToDatabase;
  try {
    ({ app, connectToDatabase } = await loadApp());
  } catch (error) {
    console.error("App init failed:", error?.stack || error);
    return fail(res, 500, "INIT_FAILED", {
      message: error?.message || String(error),
      stack: (error?.stack || "").split("\n").slice(0, 12),
    });
  }

  try {
    await connectToDatabase();
  } catch (error) {
    return fail(res, 503, "DB_UNREACHABLE", {
      message: error?.message || String(error),
      hint: "Check MONGODB_URI and the Atlas Network Access allowlist (0.0.0.0/0).",
    });
  }

  try {
    return await app(req, res);
  } catch (error) {
    console.error("Handler failed:", req.url, error?.stack || error);
    return fail(res, 500, "HANDLER_FAILED", {
      path: req.url,
      message: error?.message || String(error),
    });
  }
}
