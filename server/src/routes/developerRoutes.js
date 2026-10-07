import express from "express";
import { validateUser } from "../middleware/protect.js";
import {
  getDeveloperOverview,
  createApiKey,
  revokeApiKey,
  rotateApiKey,
  subscribePlan,
} from "../controllers/developerController.js";

const developerRoutes = express.Router();

// Developer portal endpoints require authenticated user session
developerRoutes.use(validateUser);

developerRoutes.get("/overview", getDeveloperOverview);
developerRoutes.post("/keys", createApiKey);
developerRoutes.patch("/keys/:id/revoke", revokeApiKey);
developerRoutes.patch("/keys/:id/rotate", rotateApiKey);
developerRoutes.post("/subscribe", subscribePlan);

export default developerRoutes;
