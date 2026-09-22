import { createUserService, generateAccessToken, generateRefreshToken } from "../services/userService.js";
import { createMeasurementService } from "../services/measurementService.js";
import { calculateBMI, getBMICategory } from "../utils/bmiCalculator.js";
import { User } from "../models/User.js";
import "dotenv/config";
import bcrypt from "bcryptjs";

//Create a User
export async function createUser(req, res, next) {
  try {
    const { name, email, password, height, weight } = req.body;
    const user = await createUserService(name, email, password, height, weight);

    // Automatically create initial Measurement entry from registration height & weight
    const bmi = calculateBMI(height, weight);
    const category = getBMICategory(bmi);
    await createMeasurementService(user._id, height, weight, bmi, category);

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        height: user.height,
        weight: user.weight,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function loginUser(req, res, next) {
  try {
    const user = req.user;

    const accessToken = await generateAccessToken(user);
    const rawRefreshToken = await generateRefreshToken(user);

    const refreshTokenHash = await bcrypt.hash(rawRefreshToken, 10);

    await User.findByIdAndUpdate(user._id, {
      $push: { refreshTokens: { token: refreshTokenHash } },
    });

    res.cookie("refreshToken", rawRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Login successfull",
      "Access token": accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        height: user.height,
        weight: user.weight,
      },
    });
  } catch (error) {
    next(error);
  }
}

export function getCurrentUser(req, res, next) {
  return res.status(200).json({
   user: req.user
  });
}

export async function getNewAccessToken(req, res, next) {
  try {
    const accessToken = await generateAccessToken(req.user);

    res.status(200).json({
      message: "New access token generated successfully",
      "New access token": accessToken,
    });
  } catch (error) {
    next(error);
  }
}


export async function logoutUser(req, res, next) {
  const refreshToken = req.cookies?.refreshToken || req.body.token;
  try {
    if (refreshToken) {
      await User.updateOne(
        { "refreshTokens.token": refreshToken },
        { $pull: { refreshTokens: { token: refreshToken } } }
      );

    }

    res.clearCookie("refreshToken");
    res.status(200).json({
      message: "Logged out  successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function logoutFromAll(req, res, next) {
  const userId = req.user.id;
  try {
    await User.findByIdAndUpdate(userId, { $set: { refreshTokens: [] } });

    res.clearCookie("refreshToken");

    res.status(200).json({
      message: "Logged out from all devices",
    });
  } catch (error) {
    next(error);
  }
}
