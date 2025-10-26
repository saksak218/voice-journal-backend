import express from "express";
import { FRONTEND_URL, PORT } from "./config/env.js";
import dbConnect from "./database/mongodb.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import errorMiddleware from "./middlewares/error.middleware.js";
import authRouter from "./routes/auth.routes.js";
import authorize from "./middlewares/auth.middleware.js";
import audioRouter from "./routes/audio.routes.js";
import adminRouter from "./routes/admin.routes.js";

const app = express();

app.use(
  cors({
    origin: [
      "https://voice-journal-frontend.vercel.app",
      FRONTEND_URL,
      "https://voice-journal-frontend-goe1hmm3x-suleman-altafs-projects.vercel.app",
    ],
    credentials: true,
    preflightContinue: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//Routes
app.use("/api/auth", authRouter);
app.use("/api/audio", audioRouter);
app.use("/api/admin", adminRouter);

app.use(errorMiddleware);

app.get("/", (req, res) => {
  res.send("Hello world");
});

dbConnect().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
