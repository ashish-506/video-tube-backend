import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

//user router import
import userRouter from "./routes/user.routes.js";
app.use("/api/v1/users", userRouter);

// video router import
import videoRouter from "./routes/video.routes.js";
app.use("/api/v1/videos", videoRouter);

// subscription route import
import subscriptionRouter from "./routes/subscription.routes.js";
app.use("/api/v1/subscriptions", subscriptionRouter);

// comment route import
import commentRouter from "./routes/comment.routes.js";
app.use("/api/v1/comments", commentRouter);

// like route import
import likeRouter from "./routes/like.routes.js";
app.use("/api/v1/likes", likeRouter);

// error Handler
import { errorHandler } from "./middlewares/error.middleware.js";
app.use(errorHandler); // must be last
export { app };
