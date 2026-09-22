import { User } from "../models/User.js"
import jwt from "jsonwebtoken";
import "dotenv/config"

//Create a User
export async function createUserService(name, email, password, height, weight ) {
    return User.create({
        name,
        email,
        password,
        height,
        weight
    })
}

export async function generateAccessToken(user) {
    const accessToken = jwt.sign(
            {userId: user._id},
            process.env.JWT_ACCESS_TOKEN_SECRET,
            {expiresIn: "15m"}
        )

    return accessToken;
}

export async function generateRefreshToken(user) {
    const refreshToken = jwt.sign(
            {userId: user._id},
            process.env.JWT_REFRESH_TOKEN_SECRET,
            {expiresIn: "7d"}
        )

    return refreshToken;
}