import express from "express";
import mongoose from "mongoose";
import EmergencyAccess from "../models/EmergencyAccess.js";
import Patient from "../models/Patient.js";
import { requireRole } from "../middleware/authorize.js";

const router = express.Router();

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ── Doctor initiates emergency access ───────────────────────────────────────

/**
 * POST /api/emergency-access
 * Doctor initiates break-glass access for a patient.
 * Body: { patientId, reason, durationMinutes? }
 * Default duration: 60 minutes
 */
router.post("/", requireRole("doctor"), async (req, res) => {
  try {
    const { patientId, reason, durationMinutes } = req.body;

    if (!patientId || !reason) {
      return res
        .status(400)
        .json({ message: "patientId and reason are required." });
    }

    if (!isValidObjectId(patientId)) {
      return res.status(400).json({ message: "Invalid patient ID." });
    }

    // Verify patient exists in same org
    const patient = await Patient.findOne({
      _id: patientId,
      organizationId: req.user.organizationId,
      status: "active",
    }).lean();

    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    // Check for existing active emergency access by this doctor for this patient
    const existing = await EmergencyAccess.findOne({
      accessedByUserId: req.user._id,
      patientId,
      organizationId: req.user.organizationId,
      status: "active",
      expiresAt: { $gt: new Date() },
    });

    if (existing) {
      return res.status(409).json({
        message: "Active emergency access already exists for this patient.",
        emergencyAccess: existing.toJSON(),
      });
    }

    const duration = Math.min(Math.max(parseInt(durationMinutes) || 60, 5), 480); // 5 min to 8 hours
    const now = new Date();
    const expiresAt = new Date(now.getTime() + duration * 60 * 1000);

    const emergencyAccess = await EmergencyAccess.create({
      patientId,
      organizationId: req.user.organizationId,
      accessedByUserId: req.user._id,
      reason: String(reason).trim(),
      startedAt: now,
      expiresAt,
      status: "active",
    });

    res.status(201).json({ emergencyAccess: emergencyAccess.toJSON() });
  } catch (error) {
    console.error("Initiate emergency access error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// ── Doctor ends emergency access early ──────────────────────────────────────

/**
 * PUT /api/emergency-access/:accessId/end
 * Doctor ends their own emergency access early.
 */
router.put("/:accessId/end", requireRole("doctor"), async (req, res) => {
  try {
    const { accessId } = req.params;

    if (!isValidObjectId(accessId)) {
      return res
        .status(404)
        .json({ message: "Emergency access not found." });
    }

    const emergencyAccess = await EmergencyAccess.findOne({
      _id: accessId,
      accessedByUserId: req.user._id,
      organizationId: req.user.organizationId,
      status: "active",
    });

    if (!emergencyAccess) {
      return res
        .status(404)
        .json({ message: "Active emergency access not found." });
    }

    emergencyAccess.status = "ended";
    emergencyAccess.endedAt = new Date();
    await emergencyAccess.save();

    res.json({ emergencyAccess: emergencyAccess.toJSON() });
  } catch (error) {
    console.error("End emergency access error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// ── List emergency accesses ─────────────────────────────────────────────────

/**
 * GET /api/emergency-access
 * Doctor: own accesses. Admin: all in org. Can filter by patientId and status.
 */
router.get("/", async (req, res) => {
  try {
    const filter = { organizationId: req.user.organizationId };

    if (req.user.role === "doctor") {
      filter.accessedByUserId = req.user._id;
    }
    // admin: no additional filter

    // Optional filters
    if (req.query.patientId && isValidObjectId(req.query.patientId)) {
      filter.patientId = req.query.patientId;
    }
    if (req.query.status && ["active", "expired", "ended"].includes(req.query.status)) {
      filter.status = req.query.status;
    }

    const accesses = await EmergencyAccess.find(filter)
      .sort({ startedAt: -1 })
      .lean();

    res.json({ emergencyAccesses: accesses });
  } catch (error) {
    console.error("List emergency access error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// ── Get emergency access by ID ──────────────────────────────────────────────

/**
 * GET /api/emergency-access/:accessId
 * Doctor: own access only. Admin: any in org.
 */
router.get("/:accessId", async (req, res) => {
  try {
    const { accessId } = req.params;

    if (!isValidObjectId(accessId)) {
      return res
        .status(404)
        .json({ message: "Emergency access not found." });
    }

    const filter = {
      _id: accessId,
      organizationId: req.user.organizationId,
    };

    if (req.user.role === "doctor") {
      filter.accessedByUserId = req.user._id;
    }

    const access = await EmergencyAccess.findOne(filter).lean();

    if (!access) {
      return res
        .status(404)
        .json({ message: "Emergency access not found." });
    }

    res.json({ emergencyAccess: access });
  } catch (error) {
    console.error("Get emergency access error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// ── Check if doctor has active emergency access for a patient ───────────────

/**
 * GET /api/emergency-access/check/:patientId
 * Doctor checks if they have active emergency access for a specific patient.
 */
router.get(
  "/check/:patientId",
  requireRole("doctor"),
  async (req, res) => {
    try {
      const { patientId } = req.params;

      if (!isValidObjectId(patientId)) {
        return res.status(400).json({ message: "Invalid patient ID." });
      }

      const now = new Date();

      const access = await EmergencyAccess.findOne({
        accessedByUserId: req.user._id,
        patientId,
        organizationId: req.user.organizationId,
        status: "active",
        expiresAt: { $gt: now },
      }).lean();

      res.json({
        hasAccess: !!access,
        emergencyAccess: access || null,
      });
    } catch (error) {
      console.error("Check emergency access error:", error);
      res.status(500).json({ message: "Internal server error." });
    }
  }
);

export default router;
