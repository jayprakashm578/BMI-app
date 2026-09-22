import { User } from "../models/User.js";
import jwt from "jsonwebtoken";
import "dotenv/config";


export async function validateUser(req, res, next) {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      if (!token) {
        return res.status(401).json({
          error: "Unauthorised",
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET);

      req.user = await User.findById(decoded.userId).select("-password");

      if (!req.user) {
        return res.status(401).json({
          error: "User belonging to this token no longer exists ",
        });
      }

      return next();
    } catch (error) {
      return res.status(403).json({
        error: "No authorization",
      });
    }
  } else {
    return res.status(401).json({
      error: "Authorization token required",
    });
  }
}

export async function validateRefreshToken(req, res, next) {
  const authHeader =
    req.headers["authorization"] || req.headers["Authorization"];

  const tokenFromHeader = authHeader && authHeader.split(" ")[1];
  const oldRefreshToken =
    req.cookies?.refreshToken || tokenFromHeader || req.body?.token;
  if (!oldRefreshToken) {
    return res.status(401).json({
      message: "Refresh token required",
    });
  }

  try {
    const decoded = jwt.verify(
      oldRefreshToken,
      process.env.JWT_REFRESH_TOKEN_SECRET,
    );

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        error: "User belonging to this token no longer exists",
      });
    }

    req.user = user;
    req.oldRefreshToken = oldRefreshToken;
    return next();
  } catch (error) {
    console.error("REFRESH ERROR:", error);

    return res.status(403).json({
      error: error.message,
    });
  }
}
