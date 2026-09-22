import { generateRefreshToken } from "../services/userService.js";
import bcrypt from "bcryptjs";

export async function generateNewRefreshToken(req, res, next) {
  const user = req.user;
  const oldRefreshToken = req.oldRefreshToken;

  try {
    let matchedSession = null;

    for (const session of user.refreshTokens) {
      const isMatch = await bcrypt.compare(oldRefreshToken, session.token);

      if (isMatch) {
        matchedSession = session;
        break;
      }
    }

    if (!matchedSession) {
      return res.status(401).json({
        error: "Invalid refresh token",
      });
    }

    const newRefreshToken = await generateRefreshToken(user);

    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);

    await user.updateOne({
      $pull: { refreshTokens: { token: matchedSession.token } },
    });

    await user.updateOne({
      $push: { refreshTokens: { token: newRefreshTokenHash } },
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return next();
  } catch (error) {
    next(error);
  }
}
