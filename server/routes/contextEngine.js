import express from "express";
import mongoose from "mongoose";
import Patient from "../models/Patient.js";
import Appointment from "../models/Appointment.js";
import ContextEngineResult from "../models/ContextEngineResult.js";
import { requireRole } from "../middleware/authorize.js";
import { rankPatientData, getExplanation } from "../services/contextEngine.js";

const router = express.Router();

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * POST /api/context-engine/rank
 * Generate ranked patient data for an appointment
 * Doctor only - requires appointmentId
 */
router.post("/rank", requireRole("doctor"), async (req, res) => {
  try {
    const { appointmentId } = req.body;

    if (!appointmentId || !isValidObjectId(appointmentId)) {
      return res.status(400).json({ message: "Valid appointmentId is required." });
    }

    // Get appointment details
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      organizationId: req.user.organizationId,
    }).populate("doctorId").lean();

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    // Verify patient exists
    const patient = await Patient.findOne({
      _id: appointment.patientId,
      organizationId: req.user.organizationId,
    }).lean();

    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    // Determine specialty (default to "general" if not specified)
    const specialty = appointment.type || "general";

    // Run context engine
    const rankedData = await rankPatientData(
      appointment.patientId,
      specialty,
      req.user.organizationId
    );

    // Save result
    const result = await ContextEngineResult.create({
      appointmentId: appointment._id,
      patientId: appointment.patientId,
      organizationId: req.user.organizationId,
      specialty,
      rankedData,
    });

    // Audit: context generated
    await req.audit({
      action: "context_generated",
      resourceType: "context_engine",
      resourceId: result._id,
      patientId: appointment.patientId,
      outcome: "success",
      metadata: {
        appointmentId,
        specialty,
        criticalCount: rankedData.critical.length,
        highCount: rankedData.high.length,
        mediumCount: rankedData.medium.length,
        lowCount: rankedData.low.length,
      },
    });

    res.status(201).json({
      result: {
        _id: result._id,
        appointmentId: result.appointmentId,
        patientId: result.patientId,
        specialty: result.specialty,
        rankedData: result.rankedData,
        generatedAt: result.generatedAt,
      },
    });
  } catch (error) {
    console.error("Context engine rank error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

/**
 * GET /api/context-engine/results/:appointmentId
 * Get cached ranking result for an appointment
 * Doctor only
 */
router.get("/results/:appointmentId", requireRole("doctor"), async (req, res) => {
  try {
    const { appointmentId } = req.params;

    if (!isValidObjectId(appointmentId)) {
      return res.status(404).json({ message: "Result not found." });
    }

    const result = await ContextEngineResult.findOne({
      appointmentId,
      organizationId: req.user.organizationId,
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!result) {
      return res.status(404).json({ message: "No context result found for this appointment." });
    }

    res.json({ result });
  } catch (error) {
    console.error("Get context result error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

/**
 * GET /api/context-engine/explain/:priority/:itemType
 * Get explanation for why an item was ranked at a specific priority
 */
router.get("/explain/:priority/:itemType", requireRole("doctor"), async (req, res) => {
  try {
    const { priority, itemType } = req.params;

    const validPriorities = ["critical", "high", "medium", "low"];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ message: "Invalid priority level." });
    }

    const explanation = getExplanation(priority, itemType);

    res.json({ priority, itemType, explanation });
  } catch (error) {
    console.error("Get explanation error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

export default router;
