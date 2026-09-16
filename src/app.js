import express from "express"
import cors from "cors"
import cookieparser from "cookie-parser"
import multer from "multer"

const app = express()

app.use(cors({
    origin : process.env.CORS_ORIGIN,
    credentials : true
}))

app.use(express.json({limit: "20kb"}))
app.use(express.urlencoded({extended : true , limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieparser())


//routes import

import userRouter from "./routes/user.routes.js"
import commentRouter from "./routes/comment.routes.js"
import likeRouter from "./routes/like.routes.js"
import playlistRouter from "./routes/playlist.routes.js"
import tweetRouter from "./routes/tweet.routes.js"

// routes declaration
app.use("/api/v1/users", userRouter)  //prefix
app.use("/api/v1/comments", commentRouter)
app.use("/api/v1/likes", likeRouter)
app.use("/api/v1/playlists", playlistRouter)
app.use("/api/v1/tweets", tweetRouter)

app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError && error.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({
            success: false,
            message: `Invalid file field "${error.field}". Use "avatar" or "coverImage".`,
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

export {app} 