import { Router } from "express";
import express from "express";
import { validateUser } from "../middleware/protect.js";
import { createMeasurement, getMeasurements, deleteMeasurement } from "../controllers/measurementController.js";

const measurementRoutes = express.Router();

measurementRoutes.post("/", validateUser, createMeasurement);
measurementRoutes.get("/", validateUser, getMeasurements);
measurementRoutes.delete("/:id", validateUser, deleteMeasurement);


export default measurementRoutes;