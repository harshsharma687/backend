import express from "express"
import cors from "cors"
import cookieparser from "cookie-parser"
import multer from "multer"
import path from "node:path"
import { fileURLToPath } from "node:url"

const app = express()

// Absolute path to public/ so static assets work everywhere — locally, on
// Vercel serverless (where cwd-relative "public" breaks), or on any host.
const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public")

// Behind proxies/load balancers (Render, Railway, Fly, Heroku, Nginx...) the
// app must trust X-Forwarded-* so req.protocol/secure cookies work correctly.
app.set("trust proxy", 1)

// Deployment-safe CORS. Same-origin requests carry no Origin header and always
// pass. CORS_ORIGIN controls cross-origin calls:
//   "*"  → allow every origin (fine for dev/learning; cookies still work because
//          we echo the request origin instead of a literal *)
//   "a,b" → allow-list, e.g. "https://novaplay.vercel.app,http://localhost:5173"
//   empty → same-origin only
const allowedOrigins = String(process.env.CORS_ORIGIN || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean)
const allowAllOrigins = allowedOrigins.includes("*")

app.use(cors({
    origin: (requestOrigin, callback) => {
        if (!requestOrigin) return callback(null, true); // same-origin / curl / mobile app
        if (allowAllOrigins || allowedOrigins.includes(requestOrigin)) {
            return callback(null, true);
        }
        return callback(null, false); // don't throw — just don't emit CORS headers
    },
    credentials: true,
}))

app.use(express.json({limit: "20kb"}))
app.use(express.urlencoded({extended : true , limit: "16kb"}))
app.use(express.static(PUBLIC_DIR))

// Health check for uptime monitors & hosting platforms
app.get("/healthz", (_, res) => res.status(200).json({ status: "ok" }))
app.use(cookieparser())


//routes import

import userRouter from "./routes/user.routes.js"
import commentRouter from "./routes/comment.routes.js"
import likeRouter from "./routes/like.routes.js"
import playlistRouter from "./routes/playlist.routes.js"
import tweetRouter from "./routes/tweet.routes.js"
import videoRouter from "./routes/video.routes.js"
import subscriptionRouter from "./routes/subscription.routes.js"
import postRouter from "./routes/post.routes.js"

// routes declaration
app.use("/api/v1/users", userRouter)  //prefix
app.use("/api/v1/comments", commentRouter)
app.use("/api/v1/likes", likeRouter)
app.use("/api/v1/playlists", playlistRouter)
app.use("/api/v1/tweets", tweetRouter)
app.use("/api/v1/videos", videoRouter)
app.use("/api/v1/subscriptions", subscriptionRouter)
app.use("/api/v1/posts", postRouter)

app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        const message = error.code === "LIMIT_FILE_SIZE"
            ? "File is too large. The maximum upload size is 500 MB."
            : `Invalid upload field "${error.field}". Check the selected form fields.`
        return res.status(400).json({
            success: false,
            message,
            errors: [],
        })
    }

    const statusCode = error.statusCode || error.statuscode || 500

    res.status(statusCode).json({
        success: false,
        message: error.message || "Internal server error",
        errors: error.errors || [],
    })
})

export { app };
// Vercel's runtime occasionally resolves an entry path back to this module —
// a valid default export here keeps those invocations from crashing with
// "Invalid export found in module /var/task/src/app.js".
export default app; 
