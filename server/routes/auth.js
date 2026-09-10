import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";
import Organization from "../models/Organization.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

/**
 * Normalizes email by trimming and lowercasing
 */
const normalizeEmail = (email) => {
  return String(email || "").trim().toLowerCase();
};

/**
 * POST /api/auth/register
 */
router.post("/register", authLimiter, async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { email, password, role, givenName, familyName, dateOfBirth, displayName } = req.body;

    // 1. Validation
    if (!email || !password || !role) {
      throw new Error("Validation: Email, password, and role are required.");
    }
    if (password.length < 8) {
      throw new Error("Validation: Password must be at least 8 characters long.");
    }
    const cleanEmail = normalizeEmail(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error("Validation: Invalid email format.");
    }

    // Role restrictions: Prevent privilege escalation
    if (role === "admin") {
      throw new Error("Validation: Cannot register as admin through public registration.");
    }
    if (role !== "patient" && role !== "doctor") {
      throw new Error("Validation: Invalid role.");
    }

    // 2. Organization handling
    // SECURITY: NEVER trust organizationId from the client.
    // We strictly resolve the development organization by name.
    const defaultOrg = await Organization.findOne({ name: "Demo General Hospital", status: "active" }).session(session);
    if (!defaultOrg) {
      throw new Error("Server Configuration Error: Trusted development organization is missing from the database.");
    }
    const targetOrgId = defaultOrg._id;

    // 3. Prevent duplicates safely
    const existingUser = await User.findOne({ email: cleanEmail }).session(session);
    if (existingUser) {
      // Return a safe generic error for account enumeration protection
      throw new Error("Validation: Email already in use.");
    }

    // 4. Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // 5. Create User
    const [newUser] = await User.create([{
      email: cleanEmail,
      passwordHash,
      role,
      organizationId: targetOrgId,
      status: "active",
      displayName: displayName || `${givenName || ""} ${familyName || ""}`.trim()
    }], { session });

    // 6. Create Profile (Doctor or Patient)
    if (role === "patient") {
      if (!givenName || !familyName || !dateOfBirth) {
        throw new Error("Validation: givenName, familyName, and dateOfBirth are required for patients.");
      }
      await Patient.create([{
        userId: newUser._id,
        organizationId: targetOrgId,
        givenName: String(givenName).trim(),
        familyName: String(familyName).trim(),
        dateOfBirth: new Date(dateOfBirth),
        status: "active"
      }], { session });
    } else if (role === "doctor") {
      if (!displayName) {
        throw new Error("Validation: displayName is required for doctors.");
      }
      await Doctor.create([{
        userId: newUser._id,
        organizationId: targetOrgId,
        displayName: String(displayName).trim(),
        status: "active"
      }], { session });
    }

    await session.commitTransaction();
    session.endSession();

    // Safety check - never return password hash
    const userResponse = newUser.toJSON();

    return res.status(201).json({
      message: "Registration successful.",
      user: userResponse
    });

  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();

    if (error.message.startsWith("Validation:")) {
      return res.status(400).json({ message: error.message.replace("Validation: ", "") });
    }

    console.error("Registration error:", error);
    return res.status(500).json({ message: "Internal server error during registration." });
  }
});

/**
 * POST /api/auth/login
 */
router.post("/login", authLimiter, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email });

    // Generic error for non-existent users
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Check account status
    if (user.status !== "active") {
      return res.status(401).json({ message: "Account is disabled or suspended." });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing");
      return res.status(500).json({ message: "Internal server error." });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
    );

    user.lastLoginAt = new Date();
    await user.save();

    return res.json({
      message: "Login successful.",
      token,
      user: user.toJSON()
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error during login." });
  }
});

/**
 * POST /api/auth/logout
 */
router.post("/logout", async (req, res) => {
  // Since we use standard JWT, there is no server-side token invalidation.
  // We simply instruct the client to discard the token.
  res.json({ message: "Logged out successfully. Please discard the token." });
});

/**
 * GET /api/auth/me
 */
router.get("/me", requireAuth, async (req, res) => {
  res.json({ user: req.user.toJSON() });
});

export default router;
