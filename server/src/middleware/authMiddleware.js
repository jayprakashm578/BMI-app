import { User } from "../models/User.js";


export async function validateRegister(req, res, next) {
  const { name, email, password, height, weight } = req.body;

  if (!name || !email) {
    return res.status(400).json({
      error: "name and email are required",
    });
  }

  if (!height || !weight) {
    return res.status(400).json({
      error: "height and weight are required",
    });
  }

  if (!password) {
    return res.status(400).json({
      error: "password is required",
    });
  }

  if (typeof name !== "string") {
    return res.status(400).json({
      error: "name must be a string",
    });
  }

  if (typeof email !== "string") {
    return res.status(400).json({
      error: "email must be a string",
    });
  }

  const cleanEmail = email.trim().toLowerCase();
  req.body.email = cleanEmail;

  const existingUser = await User.findOne({ email: cleanEmail });
  if (existingUser) {
    return res.status(409).json({
      error: "email already registered",
    });
  }

  next();
}

export async function verifyLoginCredentials(req, res, next) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: "email and password are required",
    });
  }

  const cleanEmail = email.trim().toLowerCase();
  req.body.email = cleanEmail;

  const user = await User.findOne({ email: cleanEmail }).select("+password");

  if (!user) {
    return res.status(401).json({
      error: "Invalid email or password",
    });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({
      error: "Invalid email or password",
    });
  }
  req.user = user;
  next();
}
