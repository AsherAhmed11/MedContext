import Consent from "../models/Consent.js";
import EmergencyAccess from "../models/EmergencyAccess.js";

/**
 * Middleware: require active consent from patient for doctor access.
 * Must run AFTER resolvePatientForClinicalResource (which sets req.clinicalPatient).
 * Doctors need active consent OR active emergency access.
 * Patients (own data) and admins are exempt.
 */
export const requireConsent = async (req, res, next) => {
  // Patients accessing own data and admins are exempt from consent check
  if (req.user.role === "patient" || req.user.role === "admin") {
    return next();
  }

  // Only applies to doctors
  if (req.user.role !== "doctor") {
    return next();
  }

  const patient = req.clinicalPatient;
  if (!patient) {
    return res.status(404).json({ message: "Patient not found." });
  }

  try {
    const now = new Date();

    // Check for active consent
    const consent = await Consent.findOne({
      patientId: patient._id,
      grantedToUserId: req.user._id,
      organizationId: req.user.organizationId,
      status: "active",
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: now } },
      ],
    }).lean();

    if (consent) {
      req.consent = consent;
      return next();
    }

    // No consent — check for active emergency access (break-glass)
    const emergencyAccess = await EmergencyAccess.findOne({
      accessedByUserId: req.user._id,
      patientId: patient._id,
      organizationId: req.user.organizationId,
      status: "active",
      expiresAt: { $gt: now },
    }).lean();

    if (emergencyAccess) {
      req.emergencyAccess = emergencyAccess;
      return next();
    }

    return res.status(403).json({
      message:
        "Access denied. Patient consent or emergency access is required to view this chart.",
    });
  } catch (error) {
    console.error("Consent check error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * Utility: check if a doctor has active consent for a patient.
 * Returns the consent document or null.
 */
export async function hasActiveConsent(doctorUserId, patientId, organizationId) {
  const now = new Date();

  const consent = await Consent.findOne({
    patientId,
    grantedToUserId: doctorUserId,
    organizationId,
    status: "active",
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gt: now } },
    ],
  }).lean();

  if (consent) return consent;

  // Check emergency access as fallback
  const emergencyAccess = await EmergencyAccess.findOne({
    accessedByUserId: doctorUserId,
    patientId,
    organizationId,
    status: "active",
    expiresAt: { $gt: now },
  }).lean();

  return emergencyAccess || null;
}
