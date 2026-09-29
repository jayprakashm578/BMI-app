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

// Helper middleware to check if passport strategy is registered before invoking authentication
function authenticateProvider(provider, options) {
  return (req, res, next) => {
    if (!passport._strategies[provider]) {
      return res.status(400).json({
        error: `OAuth provider '${provider}' is not configured on the server. Please check environment variables.`,
      });
    }
    passport.authenticate(provider, options)(req, res, next);
  };
}

// 1. Google OAuth
userRoutes.get("/google", authenticateProvider("google", { scope: ["profile", "email"], session: false }));
userRoutes.get(
  "/google/callback",
  authenticateProvider("google", { session: false, failureRedirect: `${CLIENT_URL}/login?error=sso_failed` }),
  handleSocialCallback
);

// 2. GitHub OAuth
userRoutes.get("/github", authenticateProvider("github", { scope: ["user:email"], session: false }));
userRoutes.get(
  "/github/callback",
  authenticateProvider("github", { session: false, failureRedirect: `${CLIENT_URL}/login?error=sso_failed` }),
  handleSocialCallback
);

// 3. LinkedIn OAuth
userRoutes.get("/linkedin", authenticateProvider("linkedin", { scope: ["openid", "profile", "email"], session: false }));
userRoutes.get(
  "/linkedin/callback",
  authenticateProvider("linkedin", { session: false, failureRedirect: `${CLIENT_URL}/login?error=sso_failed` }),
  handleSocialCallback
);

// 4. Facebook OAuth
userRoutes.get("/facebook", authenticateProvider("facebook", { scope: ["email"], session: false }));
userRoutes.get(
  "/facebook/callback",
  authenticateProvider("facebook", { session: false, failureRedirect: `${CLIENT_URL}/login?error=sso_failed` }),
  handleSocialCallback
);

export default userRoutes;