import express from "express";
import mongoose from "mongoose";
import Consent from "../models/Consent.js";
import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";
import User from "../models/User.js";
import { requireRole } from "../middleware/authorize.js";

const router = express.Router();

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ── Patient grants consent to a doctor ──────────────────────────────────────

/**
 * POST /api/consents
 * Patient grants consent to a specific doctor.
 * Body: { patientId, doctorUserId, purpose, expiresAt?, notes? }
 * The patientId must match the authenticated patient's own profile.
 */
router.post("/", requireRole("patient"), async (req, res) => {
  try {
    const { doctorUserId, purpose, expiresAt, notes } = req.body;

    if (!doctorUserId || !purpose) {
      return res
        .status(400)
        .json({ message: "doctorUserId and purpose are required." });
    }

    if (!isValidObjectId(doctorUserId)) {
      return res.status(400).json({ message: "Invalid doctor user ID." });
    }

    // Resolve the authenticated patient's profile
    const patient = await Patient.findOne({
      userId: req.user._id,
      organizationId: req.user.organizationId,
      status: "active",
    }).lean();

    if (!patient) {
      return res
        .status(404)
        .json({ message: "Patient profile not found." });
    }

    // Verify the target doctor exists in the same org
    const doctorUser = await User.findOne({
      _id: doctorUserId,
      organizationId: req.user.organizationId,
      role: "doctor",
      status: "active",
    }).lean();

    if (!doctorUser) {
      return res.status(404).json({ message: "Doctor not found." });
    }

    // Check for existing active consent to the same doctor
    const existingConsent = await Consent.findOne({
      patientId: patient._id,
      grantedToUserId: doctorUserId,
      status: "active",
    });

    if (existingConsent) {
      return res.status(409).json({
        message: "Active consent already exists for this doctor.",
      });
    }

    const consent = await Consent.create({
      patientId: patient._id,
      organizationId: req.user.organizationId,
      grantedToUserId: doctorUserId,
      purpose: String(purpose).trim(),
      status: "active",
      grantedAt: new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      notes: notes ? String(notes).trim() : undefined,
    });

    res.status(201).json({ consent });
  } catch (error) {
    console.error("Create consent error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// ── Patient lists their own consents ────────────────────────────────────────

/**
 * GET /api/consents
 * Patient: own consents only.
 * Doctor: consents granted to them.
 * Admin: all consents in org.
 */
router.get("/", async (req, res) => {
  try {
    const filter = { organizationId: req.user.organizationId };

    if (req.user.role === "patient") {
      const patient = await Patient.findOne({
        userId: req.user._id,
        organizationId: req.user.organizationId,
      })
        .select("_id")
        .lean();

      if (!patient) {
        return res.json({ consents: [] });
      }

      filter.patientId = patient._id;
    } else if (req.user.role === "doctor") {
      filter.grantedToUserId = req.user._id;
    }
    // admin: no additional filter, sees all in org

    const consents = await Consent.find(filter)
      .sort({ grantedAt: -1 })
      .lean();

    res.json({ consents });
  } catch (error) {
    console.error("List consents error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// ── Patient revokes consent ─────────────────────────────────────────────────

/**
 * PUT /api/consents/:consentId/revoke
 * Patient revokes their own consent.
 */
router.put(
  "/:consentId/revoke",
  requireRole("patient"),
  async (req, res) => {
    try {
      const { consentId } = req.params;

      if (!isValidObjectId(consentId)) {
        return res.status(404).json({ message: "Consent not found." });
      }

      // Resolve patient profile
      const patient = await Patient.findOne({
        userId: req.user._id,
        organizationId: req.user.organizationId,
      })
        .select("_id")
        .lean();

      if (!patient) {
        return res
          .status(404)
          .json({ message: "Patient profile not found." });
      }

      const consent = await Consent.findOne({
        _id: consentId,
        patientId: patient._id,
        organizationId: req.user.organizationId,
      });

      if (!consent) {
        return res.status(404).json({ message: "Consent not found." });
      }

      if (consent.status !== "active") {
        return res
          .status(400)
          .json({ message: `Consent is already ${consent.status}.` });
      }

      consent.status = "revoked";
      consent.revokedAt = new Date();
      await consent.save();

      res.json({ consent: consent.toJSON() });
    } catch (error) {
      console.error("Revoke consent error:", error);
      res.status(500).json({ message: "Internal server error." });
    }
  }
);

// ── Get consent by ID ───────────────────────────────────────────────────────

/**
 * GET /api/consents/:consentId
 * Patient: own consent. Doctor: consent granted to them. Admin: any in org.
 */
router.get("/:consentId", async (req, res) => {
  try {
    const { consentId } = req.params;

    if (!isValidObjectId(consentId)) {
      return res.status(404).json({ message: "Consent not found." });
    }

    const consent = await Consent.findOne({
      _id: consentId,
      organizationId: req.user.organizationId,
    }).lean();

    if (!consent) {
      return res.status(404).json({ message: "Consent not found." });
    }

    // Authorization: patient can only see own consents
    if (req.user.role === "patient") {
      const patient = await Patient.findOne({
        userId: req.user._id,
        organizationId: req.user.organizationId,
      })
        .select("_id")
        .lean();

      if (
        !patient ||
        consent.patientId.toString() !== patient._id.toString()
      ) {
        return res.status(404).json({ message: "Consent not found." });
      }
    } else if (req.user.role === "doctor") {
      // Doctor can only see consents granted to them
      if (consent.grantedToUserId.toString() !== req.user._id.toString()) {
        return res.status(404).json({ message: "Consent not found." });
      }
    }
    // admin: allowed for any consent in org

    res.json({ consent });
  } catch (error) {
    console.error("Get consent error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

export default router;
