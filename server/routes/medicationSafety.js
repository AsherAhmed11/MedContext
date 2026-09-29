import express from "express";
import mongoose from "mongoose";
import Patient from "../models/Patient.js";
import Medication from "../models/Medication.js";
import { requireRole } from "../middleware/authorize.js";
import { checkMedicationSafety, generateSafetyWarning } from "../services/medicationSafety.js";
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from "../middleware/audit.js";

const router = express.Router();

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * POST /api/medication-safety/check
 * Check safety of a new medication for a patient
 * Doctor only - requires patientId and medicationName
 */
router.post("/check", requireRole("doctor"), async (req, res) => {
  try {
    const { patientId, medicationName, dosage, frequency } = req.body;

    if (!patientId || !medicationName) {
      return res.status(400).json({
        message: "patientId and medicationName are required."
      });
    }

    if (!isValidObjectId(patientId)) {
      return res.status(400).json({ message: "Invalid patient ID." });
    }

    // Verify patient exists in organization
    const patient = await Patient.findOne({
      _id: patientId,
      organizationId: req.user.organizationId,
    }).lean();

    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    // Create temporary medication object for checking
    const newMedication = {
      medicationName: String(medicationName).trim(),
      dosage: dosage ? String(dosage).trim() : undefined,
      frequency: frequency ? String(frequency).trim() : undefined,
      status: "active",
    };

    // Run safety check
    const concerns = await checkMedicationSafety(
      patientId,
      req.user.organizationId,
      newMedication
    );

    const safetyWarning = generateSafetyWarning(concerns);

    // Audit: medication safety check
    await req.audit({
      action: "medication_safety_check",
      resourceType: AUDIT_RESOURCE_TYPES.MEDICATION,
      patientId,
      outcome: "success",
      metadata: {
        medicationName: newMedication.medicationName,
        concernCount: concerns.length,
        safetyStatus: safetyWarning.status,
      },
    });

    res.json({
      medication: newMedication,
      safetyWarning,
      concerns,
      checkDate: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Medication safety check error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

/**
 * GET /api/medication-safety/patient/:patientId
 * Get comprehensive safety review for all patient medications
 * Doctor only
 */
router.get("/patient/:patientId", requireRole("doctor"), async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!isValidObjectId(patientId)) {
      return res.status(404).json({ message: "Patient not found." });
    }

    // Verify patient exists in organization
    const patient = await Patient.findOne({
      _id: patientId,
      organizationId: req.user.organizationId,
    }).lean();

    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    // Run comprehensive safety check (no new medication)
    const concerns = await checkMedicationSafety(
      patientId,
      req.user.organizationId
    );

    const safetyWarning = generateSafetyWarning(concerns);

    // Get current medications for context
    const medications = await Medication.find({
      patientId,
      organizationId: req.user.organizationId,
      status: "active",
    }).lean();

    // Audit: comprehensive medication review
    await req.audit({
      action: "medication_safety_review",
      resourceType: AUDIT_RESOURCE_TYPES.PATIENT,
      patientId,
      outcome: "success",
      metadata: {
        medicationCount: medications.length,
        concernCount: concerns.length,
        safetyStatus: safetyWarning.status,
      },
    });

    res.json({
      patientId,
      medications,
      safetyWarning,
      concerns,
      reviewDate: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Patient medication safety review error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

/**
 * GET /api/medication-safety/interactions/:drugClass
 * Get known interactions for a drug class
 * Educational endpoint for doctors
 */
router.get("/interactions/:drugClass", requireRole("doctor"), async (req, res) => {
  try {
    const { drugClass } = req.params;

    // Import the interaction data
    const { DRUG_INTERACTIONS, DRUG_CLASSES } = await import("../services/medicationSafety.js");

    // Find interactions involving this drug class
    const interactions = DRUG_INTERACTIONS.filter(
      interaction =>
        interaction.drug1Class === drugClass ||
        interaction.drug2Class === drugClass
    );

    // Get drugs in this class
    const drugsInClass = DRUG_CLASSES[drugClass] || [];

    res.json({
      drugClass,
      drugsInClass,
      interactions,
      interactionCount: interactions.length,
      disclaimer: "This is educational information for clinical reference. Always consult current drug interaction databases for prescribing decisions.",
    });
  } catch (error) {
    console.error("Drug interaction lookup error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

export default router;