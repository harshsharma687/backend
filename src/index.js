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