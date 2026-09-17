import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

import dns from "dns";

// Some ISPs' DNS servers refuse SRV queries, which breaks the
// mongodb+srv:// connection string (querySrv ECONNREFUSED). Route DNS to
// Cloudflare / Google, which answer SRV queries reliably.
// NOTE: Google DNS is 8.8.8.8 — 8.8.8.1 was a typo.
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const connectToDatabase = async () => {
  // Retry a few times with backoff — on hosting platforms the first DNS/SRV
  // lookup right after a cold start can transiently fail (the querySrv
  // ECONNREFUSED we saw locally). One bad lookup should not kill the deploy.
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const connectionInstance = await mongoose.connect(
        `${process.env.MONGODB_URI}/${DB_NAME}`,
        { serverSelectionTimeoutMS: 15_000 }
      );
      console.log(
        `Connected to MongoDB successfully !! ${connectionInstance.connection.host}`
      );
      return;
    } catch (error) {
      console.error(
        `MongoDB connection attempt ${attempt}/${maxAttempts} failed:`,
        error?.message || error
      );
      if (attempt === maxAttempts) {
        console.error("Giving up — check MONGODB_URI / network / Atlas IP allowlist (0.0.0.0/0 for dynamic hosts).");
        // The plain server (src/index.js) exits on failure; the Vercel serverless
        // entry (api/index.js) catches the thrown error and answers 503 instead.
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    }
  }
};

export default connectToDatabase;
