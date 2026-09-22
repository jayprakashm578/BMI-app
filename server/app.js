import express from "express";
import cors from "cors";
import userRoutes from "./src/routes/userRoutes.js";
import measurementRoutes from "./src/routes/measuremetnRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

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
