import express from "express";
import cors from "cors";
import passport from "./src/config/passport.js";
import userRoutes from "./src/routes/userRoutes.js";
import measurementRoutes from "./src/routes/measuremetnRoutes.js";

const app = express();

app.set("trust proxy", 1);

app.use(
  cors({
    origin: process.env.CLIENT_URL || true,
    credentials: true,
  })
);
app.use(express.json());
app.use(passport.initialize());

app.use("/api/user", userRoutes);
app.use("/api/measurement", measurementRoutes);

app.get("/", (req, res) =>{
    res.send("BMI Express backend.")
});

app.get("/api/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        message: "BMI app is healthy"
    });
});

export default app;
