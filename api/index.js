// Vercel serverless entry point. Vercel imports this default handler for the
// /api/* routes (see vercel.json rewrite) and passes each request through the
// full Express app — routes, auth, uploads, everything.
import { app } from "../src/app.js";

export default async function handler(req, res) {
  return app(req, res);
}
