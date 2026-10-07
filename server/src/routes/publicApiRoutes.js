import express from "express";
import { validateApiKey } from "../middleware/apiKeyAuth.js";
import {
  calculateBmiPublic,
  analyzeProgressPublic,
  idealWeightPublic,
} from "../controllers/publicApiController.js";

const publicApiRoutes = express.Router();

// All public v1 endpoints require a valid API Key
publicApiRoutes.use(validateApiKey);

publicApiRoutes.post("/calculate-bmi", calculateBmiPublic);
publicApiRoutes.post("/analyze-progress", analyzeProgressPublic);
publicApiRoutes.post("/ideal-weight", idealWeightPublic);

export default publicApiRoutes;
