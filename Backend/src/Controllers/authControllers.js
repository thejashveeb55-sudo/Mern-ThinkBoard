import bcrypt from "bcryptjs";
import User from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";
import {
  generateAccessToken,
  generateRefreshTokenString,
  getRefreshTokenExpiry,
} from "../utils/tokenUtils.js";

const COOKIE_BASE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
};

async function issueTokenPair(res, userId, deviceId, isAdmin) {
  const accessToken = generateAccessToken(userId, isAdmin);
  const refreshTokenString = generateRefreshTokenString();

  await RefreshToken.create({
    userId,
    token: refreshTokenString,
    deviceId,
    expiresAt: getRefreshTokenExpiry(),
  });

  res.cookie("accessToken", accessToken, { ...COOKIE_BASE_OPTIONS, maxAge: 30 * 60 * 1000 });
  res.cookie("refreshToken", refreshTokenString, { ...COOKIE_BASE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.cookie("deviceId", deviceId, { ...COOKIE_BASE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

export async function register(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash });

    res.status(201).json({ message: "Registered successfully", userId: user._id });
  } catch (error) {
    console.error("Error in register controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function login(req, res) {
  try {
    const { email, password, deviceId } = req.body;
    if (!email || !password || !deviceId) {
      return res.status(400).json({ message: "Email, password, and deviceId are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) return res.status(401).json({ message: "Invalid email or password" });

    await issueTokenPair(res, user._id, deviceId, user.isAdmin);
    res.status(200).json({ message: "Login successful" });
  } catch (error) {
    console.error("Error in login controller", error);
    res.status(500).json({ message: "Login failed, please try again" });
  }
}

export async function refresh(req, res) {
  try {
    const { refreshToken, deviceId } = req.cookies;
    if (!refreshToken || !deviceId) return res.status(401).json({ message: "Please log in again" });

    const existingToken = await RefreshToken.findOne({ token: refreshToken });
    if (!existingToken) return res.status(401).json({ message: "Please log in again" });
    if (existingToken.expiresAt < new Date()) return res.status(401).json({ message: "Please log in again" });

    if (existingToken.status === "used") {
      await RefreshToken.updateMany({ userId: existingToken.userId }, { status: "revoked" });
      res.clearCookie("accessToken", COOKIE_BASE_OPTIONS);
      res.clearCookie("refreshToken", COOKIE_BASE_OPTIONS);
      res.clearCookie("deviceId", COOKIE_BASE_OPTIONS);
      return res.status(401).json({ message: "Security issue detected — please log in again" });
    }

    if (existingToken.status === "revoked") return res.status(401).json({ message: "Please log in again" });

    existingToken.status = "used";
    await existingToken.save();

    const user = await User.findById(existingToken.userId);
    await issueTokenPair(res, existingToken.userId, deviceId, user?.isAdmin || false);
    res.status(200).json({ message: "Token refreshed" });
  } catch (error) {
    console.error("Error in refresh controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function logout(req, res) {
  try {
    const { refreshToken } = req.cookies;
    if (refreshToken) {
      await RefreshToken.updateOne({ token: refreshToken }, { status: "revoked" }).catch(() => {});
    }
    res.clearCookie("accessToken", COOKIE_BASE_OPTIONS);
    res.clearCookie("refreshToken", COOKIE_BASE_OPTIONS);
    res.clearCookie("deviceId", COOKIE_BASE_OPTIONS);
    res.status(200).json({ message: "Logged out" });
  } catch (error) {
    console.error("Error in logout controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}