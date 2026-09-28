import AuditLog from "../models/AuditLog.js";

/**
 * Create an audit log entry.
 * Call this from route handlers after performing an auditable action.
 *
 * @param {Object} params
 * @param {ObjectId} params.organizationId - The organization context
 * @param {ObjectId} [params.actorUserId] - The user who performed the action
 * @param {ObjectId} [params.patientId] - The patient affected (if applicable)
 * @param {string} params.action - The action performed (e.g., "view_chart", "revoke_consent")
 * @param {string} params.resourceType - The resource type (e.g., "patient", "consent", "emergency_access")
 * @param {ObjectId} [params.resourceId] - The specific resource ID
 * @param {string} params.outcome - "success", "failure", or "denied"
 * @param {string} [params.reason] - Explanation (especially for denials/emergency)
 * @param {Object} [params.metadata] - Additional context data
 * @param {string} [params.ipAddress] - Client IP
 * @param {string} [params.userAgent] - Client user agent
 */
export async function logAudit({
  organizationId,
  actorUserId,
  patientId,
  action,
  resourceType,
  resourceId,
  outcome,
  reason,
  metadata,
  ipAddress,
  userAgent,
}) {
  try {
    await AuditLog.create({
      organizationId,
      actorUserId,
      patientId,
      action,
      resourceType,
      resourceId,
      outcome,
      reason,
      metadata,
      ipAddress,
      userAgent,
      timestamp: new Date(),
    });
  } catch (error) {
    // Audit logging should never crash the main request
    console.error("Audit log write failed:", error);
  }
}

/**
 * Express middleware: attaches audit helper to req for convenience.
 * Usage in routes: req.audit({ action, resourceType, ... })
 */
export function auditMiddleware(req, res, next) {
  req.audit = (params) => {
    return logAudit({
      ...params,
      organizationId: params.organizationId || req.user?.organizationId,
      actorUserId: params.actorUserId || req.user?._id,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers["user-agent"],
    });
  };
  next();
}

// ── Common action constants ─────────────────────────────────────────────────

export const AUDIT_ACTIONS = {
  // Consent
  CONSENT_GRANTED: "consent_granted",
  CONSENT_REVOKED: "consent_revoked",
  CONSENT_EXPIRED: "consent_expired",

  // Emergency access
  EMERGENCY_ACCESS_INITIATED: "emergency_access_initiated",
  EMERGENCY_ACCESS_ENDED: "emergency_access_ended",
  EMERGENCY_ACCESS_EXPIRED: "emergency_access_expired",

  // Patient chart
  CHART_VIEWED: "chart_viewed",
  CHART_ACCESSED: "chart_accessed",

  // Clinical resources
  APPOINTMENT_CREATED: "appointment_created",
  APPOINTMENT_VIEWED: "appointment_viewed",
  MEDICATION_CREATED: "medication_created",
  MEDICATION_VIEWED: "medication_viewed",
  MEDICAL_HISTORY_CREATED: "medical_history_created",
  MEDICAL_HISTORY_VIEWED: "medical_history_viewed",
  MEDICAL_REPORT_CREATED: "medical_report_created",
  MEDICAL_REPORT_VIEWED: "medical_report_viewed",

  // Admin
  USER_STATUS_CHANGED: "user_status_changed",
  DOCTOR_PROFILE_UPDATED: "doctor_profile_updated",
  PATIENT_PROFILE_UPDATED: "patient_profile_updated",

  // Auth
  USER_REGISTERED: "user_registered",
  USER_LOGIN: "user_login",
};

export const AUDIT_RESOURCE_TYPES = {
  PATIENT: "patient",
  CONSENT: "consent",
  EMERGENCY_ACCESS: "emergency_access",
  APPOINTMENT: "appointment",
  MEDICATION: "medication",
  MEDICAL_HISTORY: "medical_history",
  MEDICAL_REPORT: "medical_report",
  USER: "user",
  DOCTOR: "doctor",
};
