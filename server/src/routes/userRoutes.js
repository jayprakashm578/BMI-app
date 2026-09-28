import express from "express";
import passport from "../config/passport.js";
import { validateRegister, verifyLoginCredentials } from "../middleware/authMiddleware.js";
import { createUser, loginUser, getCurrentUser, logoutUser, logoutFromAll, getNewAccessToken, handleSocialCallback } from "../controllers/userController.js";
import { validateRefreshToken, validateUser } from "../middleware/protect.js";
import { generateNewRefreshToken } from "../controllers/refreshController.js";

const userRoutes = express.Router();

userRoutes.post("/register", validateRegister, createUser);
userRoutes.post("/login", verifyLoginCredentials, loginUser);
userRoutes.get("/me", validateUser, getCurrentUser);
userRoutes.post("/refresh", validateRefreshToken, generateNewRefreshToken, getNewAccessToken);
userRoutes.post("/logout", logoutUser);
userRoutes.post("/logout-all", validateUser, logoutFromAll);

// --- OAuth Social Login Trigger & Callback Routes ---
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// 1. Google OAuth
userRoutes.get("/google", passport.authenticate("google", { scope: ["profile", "email"], session: false }));
userRoutes.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: `${CLIENT_URL}/login?error=sso_failed` }),
  handleSocialCallback
);

// 2. GitHub OAuth
userRoutes.get("/github", passport.authenticate("github", { scope: ["user:email"], session: false }));
userRoutes.get(
  "/github/callback",
  passport.authenticate("github", { session: false, failureRedirect: `${CLIENT_URL}/login?error=sso_failed` }),
  handleSocialCallback
);

// 3. LinkedIn OAuth
userRoutes.get("/linkedin", passport.authenticate("linkedin", { scope: ["openid", "profile", "email"], session: false }));
userRoutes.get(
  "/linkedin/callback",
  passport.authenticate("linkedin", { session: false, failureRedirect: `${CLIENT_URL}/login?error=sso_failed` }),
  handleSocialCallback
);

// 4. Facebook OAuth
userRoutes.get("/facebook", passport.authenticate("facebook", { scope: ["email"], session: false }));
userRoutes.get(
  "/facebook/callback",
  passport.authenticate("facebook", { session: false, failureRedirect: `${CLIENT_URL}/login?error=sso_failed` }),
  handleSocialCallback
);

export default userRoutes;