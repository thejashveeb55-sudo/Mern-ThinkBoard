import jwt from "jsonwebtoken";
import crypto from "crypto";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const ACCESS_TOKEN_TTL = "30m";

export function generateAccessToken(userId, isAdmin = false) {
  return jwt.sign({ userId, isAdmin }, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_TOKEN_SECRET);
}

export function generateRefreshTokenString() {
  return crypto.randomBytes(40).toString("hex");
}

export function getRefreshTokenExpiry() {
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + SEVEN_DAYS_MS);
}