import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Load .env FIRST (relative to this file, not the cwd) so every module imported
// below sees the env vars at import time (cloudinary config, etc).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Some shells/systems leak a bogus PORT (e.g. PORT=0) into the environment.
// A falsy/invalid port makes app.listen() bind to a RANDOM port, which is why
// the server seemed unreachable on 8000. Always sanitise it.
const parsedPort = Number.parseInt(process.env.PORT, 10);
const PORT =
  Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535
    ? parsedPort
    : 8000;

// Fail fast: if any required env var is missing, print WHICH ones and stop —
// much better than a deployed server that runs but breaks on first upload/login.
const REQUIRED_ENV = [
  "MONGODB_URI",
  "ACCESS_TOKEN_SECRET",
  "REFRESH_TOKEN_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Server cannot start — missing environment variables: ${missing.join(", ")}`);
  console.error("Set them in your .env file (local) or hosting dashboard (production).");
  process.exit(1);
}

if (process.env.NODE_ENV === "production" && !process.env.CORS_ORIGIN) {
  console.warn("Warning: NODE_ENV=production without CORS_ORIGIN — cross-origin frontends will be blocked by CORS.");
}

// Import app modules AFTER env is loaded.
const [{ app }, { default: connectToDatabase }] = await Promise.all([
  import("./app.js"),
  import("./db/index.js"),
]);

connectToDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`server is running at port: ${PORT}`);
    });
  })  .catch((error) => {
    console.log("mongo db connection failed !!!", error);
    process.exit(1);
  });