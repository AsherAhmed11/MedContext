import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const token = authHeader.split(" ")[1];

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured.");
      return res.status(500).json({ message: "Internal server error." });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token." });
    }

    if (!decoded.userId) {
      return res.status(401).json({ message: "Invalid token payload." });
    }

    // Database is authoritative
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: "User account not found." });
    }

    // Check account status
    if (user.status !== "active") {
      return res.status(401).json({ message: "User account is disabled or suspended." });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ message: "Internal server error during authentication." });
  }
};
