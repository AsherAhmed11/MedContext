import express from "express";
import mongoose from "mongoose";
import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";
import Appointment from "../models/Appointment.js";
import Medication from "../models/Medication.js";
import MedicalHistory from "../models/MedicalHistory.js";
import MedicalReport from "../models/MedicalReport.js";
import { requireRole } from "../middleware/authorize.js";

const router = express.Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Resolve the authenticated user's Doctor document _id.
 * Returns null if no Doctor profile exists.
 */
async function resolveDoctorId(userId) {
  const doctor = await Doctor.findOne({ userId }).select("_id").lean();
  return doctor?._id || null;
}

/**
 * Check whether a doctor has an existing clinical relationship with a patient.
 * Relationship is derived from any active or completed clinical resource.
 */
async function hasClinicalRelationship(doctorUserId, patientId, organizationId) {
  const doctorDocId = await resolveDoctorId(doctorUserId);
  if (!doctorDocId) return false;

  const [appointment, medication, history, report] = await Promise.all([
    Appointment.findOne({
      doctorId: doctorDocId,
      patientId,
      organizationId,
      status: { $in: ["scheduled", "completed"] },
    }).lean(),
    Medication.findOne({
      prescribingDoctor: doctorDocId,
      patientId,
      organizationId,
      status: "active",
    }).lean(),
    MedicalHistory.findOne({
      doctorId: doctorDocId,
      patientId,
      organizationId,
      status: "active",
    }).lean(),
    MedicalReport.findOne({
      authorDoctorId: doctorDocId,
      patientId,
      organizationId,
    }).lean(),
  ]);

  return !!(appointment || medication || history || report);
}

// ── Patient Profile Routes ───────────────────────────────────────────────────

/**
 * GET /api/patients
 * doctor: patients with existing clinical relationship
 * admin: all patients in org
 */
router.get("/", requireRole("doctor", "admin"), async (req, res) => {
  try {
    const filter = { organizationId: req.user.organizationId, status: "active" };

    if (req.user.role === "doctor") {
      const doctorDocId = await resolveDoctorId(req.user._id);
      if (!doctorDocId) {
        return res.json({ patients: [] });
      }

      const [apptPatientIds, medPatientIds, histPatientIds, reportPatientIds] =
        await Promise.all([
          Appointment.distinct("patientId", {
            doctorId: doctorDocId,
            organizationId: req.user.organizationId,
            status: { $in: ["scheduled", "completed"] },
          }),
          Medication.distinct("patientId", {
            prescribingDoctor: doctorDocId,
            organizationId: req.user.organizationId,
            status: "active",
          }),
          MedicalHistory.distinct("patientId", {
            doctorId: doctorDocId,
            organizationId: req.user.organizationId,
            status: "active",
          }),
          MedicalReport.distinct("patientId", {
            authorDoctorId: doctorDocId,
            organizationId: req.user.organizationId,
          }),
        ]);

      const patientIds = new Set();
      for (const id of [
        ...apptPatientIds,
        ...medPatientIds,
        ...histPatientIds,
        ...reportPatientIds,
      ]) {
        if (id) {
          patientIds.add(id.toString());
        }
      }

      if (patientIds.size === 0) {
        return res.json({ patients: [] });
      }

      filter._id = { $in: [...patientIds] };
    }

    const patients = await Patient.find(filter)
      .select("-__v")
      .sort({ familyName: 1, givenName: 1 })
      .lean();

    res.json({ patients });
  } catch (error) {
    console.error("List patients error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

/**
 * GET /api/patients/:patientId
 * patient: own profile only
 * doctor: requires clinical relationship
 * admin: any patient in org
 */
router.get("/:patientId", async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!isValidObjectId(patientId)) {
      return res.status(404).json({ message: "Patient not found." });
    }

    const patient = await Patient.findOne({
      _id: patientId,
      organizationId: req.user.organizationId,
    }).lean();

    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    if (req.user.role === "patient") {
      if (!patient.userId || patient.userId.toString() !== req.user._id.toString()) {
        return res.status(404).json({ message: "Patient not found." });
      }
    } else if (req.user.role === "doctor") {
      const related = await hasClinicalRelationship(
        req.user._id,
        patient._id,
        req.user.organizationId
      );
      if (!related) {
        return res.status(404).json({ message: "Patient not found." });
      }
    }
    // admin: allowed for any patient in org

    res.json({ patient });
  } catch (error) {
    console.error("Get patient error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

/**
 * PUT /api/patients/:patientId
 * admin ONLY — Phase 4 does not grant doctors or patients profile update permission
 */
router.put("/:patientId", requireRole("admin"), async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!isValidObjectId(patientId)) {
      return res.status(404).json({ message: "Patient not found." });
    }

    const patient = await Patient.findOne({
      _id: patientId,
      organizationId: req.user.organizationId,
    });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    const allowedFields = [
      "givenName",
      "familyName",
      "dateOfBirth",
      "sexAtBirth",
      "mrn",
      "status",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        patient[field] = req.body[field];
      }
    }

    await patient.save();

    res.json({ patient: patient.toJSON() });
  } catch (error) {
    console.error("Update patient error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// ── Nested Clinical Resource Helpers ─────────────────────────────────────────

/**
 * Middleware for GET clinical resources:
 * verify patient exists in org and (for patient/doctor) authorization relationship holds.
 */
async function resolvePatientForClinicalResource(req, res, next) {
  const { patientId } = req.params;

  if (!isValidObjectId(patientId)) {
    return res.status(404).json({ message: "Patient not found." });
  }

  const patient = await Patient.findOne({
    _id: patientId,
    organizationId: req.user.organizationId,
  }).lean();

  if (!patient) {
    return res.status(404).json({ message: "Patient not found." });
  }

  if (req.user.role === "patient") {
    if (!patient.userId || patient.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: "Patient not found." });
    }
  } else if (req.user.role === "doctor") {
    const related = await hasClinicalRelationship(
      req.user._id,
      patient._id,
      req.user.organizationId
    );
    if (!related) {
      return res.status(404).json({ message: "Patient not found." });
    }
  }

  req.clinicalPatient = patient;
  next();
}

/**
 * Middleware for POST clinical resources:
 * verifies patient exists in doctor's org (relationship may be established by this write).
 */
async function resolvePatientForClinicalCreation(req, res, next) {
  const { patientId } = req.params;

  if (!isValidObjectId(patientId)) {
    return res.status(404).json({ message: "Patient not found." });
  }

  const patient = await Patient.findOne({
    _id: patientId,
    organizationId: req.user.organizationId,
  }).lean();

  if (!patient) {
    return res.status(404).json({ message: "Patient not found." });
  }

  req.clinicalPatient = patient;
  next();
}

/**
 * Middleware: require doctor to have a Doctor document.
 * Resolves Doctor _id and attaches to req.doctorDocId for POST handlers.
 */
async function requireDoctorDoc(req, res, next) {
  const doctorDocId = await resolveDoctorId(req.user._id);
  if (!doctorDocId) {
    return res.status(403).json({ message: "Doctor profile not found." });
  }
  req.doctorDocId = doctorDocId;
  next();
}

// ── Appointments ─────────────────────────────────────────────────────────────

/**
 * GET /api/patients/:patientId/appointments
 * patient: own only | doctor: clinical relationship required | admin: any in org
 */
router.get(
  "/:patientId/appointments",
  resolvePatientForClinicalResource,
  async (req, res) => {
    try {
      const appointments = await Appointment.find({
        patientId: req.clinicalPatient._id,
        organizationId: req.user.organizationId,
      })
        .sort({ appointmentDate: -1 })
        .lean();

      res.json({ appointments });
    } catch (error) {
      console.error("List appointments error:", error);
      res.status(500).json({ message: "Internal server error." });
    }
  }
);

/**
 * POST /api/patients/:patientId/appointments
 * doctor only — may establish the first clinical relationship
 * doctorId set server-side, never from client
 */
router.post(
  "/:patientId/appointments",
  requireRole("doctor"),
  resolvePatientForClinicalCreation,
  requireDoctorDoc,
  async (req, res) => {
    try {
      const { appointmentDate, status, type, reason, notes } = req.body;

      if (!appointmentDate || !reason) {
        return res
          .status(400)
          .json({ message: "appointmentDate and reason are required." });
      }

      const appointment = await Appointment.create({
        patientId: req.clinicalPatient._id,
        organizationId: req.user.organizationId,
        doctorId: req.doctorDocId,
        appointmentDate: new Date(appointmentDate),
        status: status || "scheduled",
        type: type || "consultation",
        reason: String(reason).trim(),
        notes: notes ? String(notes).trim() : undefined,
      });

      res.status(201).json({ appointment });
    } catch (error) {
      console.error("Create appointment error:", error);
      res.status(500).json({ message: "Internal server error." });
    }
  }
);

// ── Medications ──────────────────────────────────────────────────────────────

/**
 * GET /api/patients/:patientId/medications
 * patient: own only | doctor: clinical relationship required | admin: any in org
 */
router.get(
  "/:patientId/medications",
  resolvePatientForClinicalResource,
  async (req, res) => {
    try {
      const medications = await Medication.find({
        patientId: req.clinicalPatient._id,
        organizationId: req.user.organizationId,
      })
        .sort({ startDate: -1 })
        .lean();

      res.json({ medications });
    } catch (error) {
      console.error("List medications error:", error);
      res.status(500).json({ message: "Internal server error." });
    }
  }
);

/**
 * POST /api/patients/:patientId/medications
 * doctor only — may establish the first clinical relationship
 * prescribingDoctor set server-side, never from client
 */
router.post(
  "/:patientId/medications",
  requireRole("doctor"),
  resolvePatientForClinicalCreation,
  requireDoctorDoc,
  async (req, res) => {
    try {
      const { medicationName, dosage, frequency, status, startDate, endDate } =
        req.body;

      if (!medicationName) {
        return res
          .status(400)
          .json({ message: "medicationName is required." });
      }

      const medication = await Medication.create({
        patientId: req.clinicalPatient._id,
        organizationId: req.user.organizationId,
        medicationName: String(medicationName).trim(),
        dosage: dosage ? String(dosage).trim() : undefined,
        frequency: frequency ? String(frequency).trim() : undefined,
        status: status || "active",
        prescribingDoctor: req.doctorDocId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });

      res.status(201).json({ medication });
    } catch (error) {
      console.error("Create medication error:", error);
      res.status(500).json({ message: "Internal server error." });
    }
  }
);

// ── Medical Histories ────────────────────────────────────────────────────────

/**
 * GET /api/patients/:patientId/medical-histories
 * patient: own only | doctor: clinical relationship required | admin: any in org
 */
router.get(
  "/:patientId/medical-histories",
  resolvePatientForClinicalResource,
  async (req, res) => {
    try {
      const medicalHistories = await MedicalHistory.find({
        patientId: req.clinicalPatient._id,
        organizationId: req.user.organizationId,
      })
        .sort({ startDate: -1 })
        .lean();

      res.json({ medicalHistories });
    } catch (error) {
      console.error("List medical histories error:", error);
      res.status(500).json({ message: "Internal server error." });
    }
  }
);

/**
 * POST /api/patients/:patientId/medical-histories
 * doctor only — may establish the first clinical relationship
 * doctorId set server-side, never from client
 */
router.post(
  "/:patientId/medical-histories",
  requireRole("doctor"),
  resolvePatientForClinicalCreation,
  requireDoctorDoc,
  async (req, res) => {
    try {
      const { condition, description, startDate, endDate, status } = req.body;

      if (!condition || !startDate) {
        return res
          .status(400)
          .json({ message: "condition and startDate are required." });
      }

      const medicalHistory = await MedicalHistory.create({
        patientId: req.clinicalPatient._id,
        organizationId: req.user.organizationId,
        condition: String(condition).trim(),
        description: description ? String(description).trim() : undefined,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        status: status || "active",
        doctorId: req.doctorDocId,
      });

      res.status(201).json({ medicalHistory });
    } catch (error) {
      console.error("Create medical history error:", error);
      res.status(500).json({ message: "Internal server error." });
    }
  }
);

// ── Medical Reports ──────────────────────────────────────────────────────────

/**
 * GET /api/patients/:patientId/medical-reports
 * patient: own only | doctor: clinical relationship required | admin: any in org
 */
router.get(
  "/:patientId/medical-reports",
  resolvePatientForClinicalResource,
  async (req, res) => {
    try {
      const medicalReports = await MedicalReport.find({
        patientId: req.clinicalPatient._id,
        organizationId: req.user.organizationId,
      })
        .sort({ reportDate: -1 })
        .lean();

      res.json({ medicalReports });
    } catch (error) {
      console.error("List medical reports error:", error);
      res.status(500).json({ message: "Internal server error." });
    }
  }
);

/**
 * POST /api/patients/:patientId/medical-reports
 * doctor only — may establish the first clinical relationship
 * authorDoctorId set server-side, never from client
 */
router.post(
  "/:patientId/medical-reports",
  requireRole("doctor"),
  resolvePatientForClinicalCreation,
  requireDoctorDoc,
  async (req, res) => {
    try {
      const {
        reportType,
        reportDate,
        fileUrl,
        summary,
        findings,
      } = req.body;

      if (!reportType || !reportDate) {
        return res
          .status(400)
          .json({ message: "reportType and reportDate are required." });
      }

      const medicalReport = await MedicalReport.create({
        patientId: req.clinicalPatient._id,
        organizationId: req.user.organizationId,
        reportType: String(reportType).trim(),
        reportDate: new Date(reportDate),
        authorDoctorId: req.doctorDocId,
        fileUrl: fileUrl ? String(fileUrl).trim() : undefined,
        summary: summary ? String(summary).trim() : undefined,
        findings: findings ? String(findings).trim() : undefined,
      });

      res.status(201).json({ medicalReport });
    } catch (error) {
      console.error("Create medical report error:", error);
      res.status(500).json({ message: "Internal server error." });
    }
  }
);

export default router;
