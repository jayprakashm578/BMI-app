import express from "express";
import { validateRegister, verifyLoginCredentials } from "../middleware/authMiddleware.js";
import { createUser, loginUser, getCurrentUser, logoutUser, logoutFromAll, getNewAccessToken } from "../controllers/userController.js";
import { validateRefreshToken, validateUser } from "../middleware/protect.js";
import { generateNewRefreshToken } from "../controllers/refreshController.js";


const userRoutes = express.Router();

userRoutes.post("/register", validateRegister, createUser);

userRoutes.post("/login",verifyLoginCredentials, loginUser);

userRoutes.get("/me",validateUser, getCurrentUser);

userRoutes.post("/refresh", validateRefreshToken,generateNewRefreshToken, getNewAccessToken);

userRoutes.post("/logout", logoutUser)

userRoutes.post("/logout-all",validateUser, logoutFromAll )

export default userRoutes;