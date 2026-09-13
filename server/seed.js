/**
 * Development-only database seed script.
 *
 * Populates MongoDB Atlas with realistic but completely fake demo data
 * for testing models, relationships, and future API/frontend development.
 *
 * Usage:
 *   NODE_ENV=development node seed.js
 *   — or via package script: npm run seed
 *
 * Safe to run repeatedly: clears only the demo data this seed creates.
 */

import dns from "node:dns";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ── DNS workaround (mirrors server/index.js) ────────────────────────────────
dns.setServers(["8.8.8.8", "8.8.4.4"]);

// ── Environment ─────────────────────────────────────────────────────────────
import dotenv from "dotenv";
import mongoose from "mongoose";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

// ── Model imports ───────────────────────────────────────────────────────────
import Organization from "./models/Organization.js";
import User from "./models/User.js";
import Doctor from "./models/Doctor.js";
import Patient from "./models/Patient.js";
import Allergy from "./models/Allergy.js";
import Medication from "./models/Medication.js";
import MedicalHistory from "./models/MedicalHistory.js";
import Appointment from "./models/Appointment.js";
import MedicalReport from "./models/MedicalReport.js";
import Consent from "./models/Consent.js";
import EmergencyAccess from "./models/EmergencyAccess.js";
import AuditLog from "./models/AuditLog.js";

// ── Safety guard ────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "development") {
  console.error(
    "Refused: NODE_ENV is not 'development'. Seed only runs in development mode."
  );
  process.exit(1);
}

// ── Connection ──────────────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI || typeof MONGODB_URI !== "string" || !MONGODB_URI.trim()) {
  console.error(
    "MONGODB_URI is missing. Set it in server/.env to your MongoDB Atlas connection string."
  );
  process.exit(1);
}

// ── Seed ────────────────────────────────────────────────────────────────────
async function seed() {
  try {
    await mongoose.connect(MONGODB_URI.trim(), {
      serverSelectionTimeoutMS: 15000,
    });
    console.log("MongoDB connected");

    // ── 1. Clear existing seed data ───────────────────────────────────────
    console.log("Clearing existing demo data...");

    await Promise.all([
      AuditLog.deleteMany({}),
      EmergencyAccess.deleteMany({}),
      Consent.deleteMany({}),
      MedicalReport.deleteMany({}),
      Appointment.deleteMany({}),
      MedicalHistory.deleteMany({}),
      Medication.deleteMany({}),
      Allergy.deleteMany({}),
      Patient.deleteMany({}),
      Doctor.deleteMany({}),
      User.deleteMany({}),
      Organization.deleteMany({}),
    ]);

    console.log("Cleared");

    // ── 2. Organization ──────────────────────────────────────────────────
    const org = await Organization.create({
      name: "Demo General Hospital",
      status: "active",
    });
    console.log(`Organization: ${org.name}`);

    // ── 3. Users ─────────────────────────────────────────────────────────
    const doctorUser = await User.create({
      email: "dr.demo@demohospital.org",
      role: "doctor",
      organizationId: org.id,
      status: "active",
      displayName: "Dr. Demo Doctor",
      lastLoginAt: new Date("2026-09-08T09:00:00Z"),
    });

    const patientUser = await User.create({
      email: "jane.demo@demomail.com",
      role: "patient",
      organizationId: org.id,
      status: "active",
      displayName: "Jane Demo Patient",
      lastLoginAt: new Date("2026-09-07T14:30:00Z"),
    });

    const adminUser = await User.create({
      email: "admin.demo@demohospital.org",
      role: "admin",
      organizationId: org.id,
      status: "active",
      displayName: "Admin Demo User",
      lastLoginAt: new Date("2026-09-09T08:00:00Z"),
    });

    console.log("Users: doctor, patient, admin");

    // ── 4. Doctor ────────────────────────────────────────────────────────
    const doctor = await Doctor.create({
      userId: doctorUser.id,
      organizationId: org.id,
      displayName: "Dr. Demo Doctor",
      licenseNumber: "MD-DEMO-12345",
      specialties: ["General Practice", "Internal Medicine"],
      status: "active",
    });
    console.log(`Doctor: ${doctor.displayName}`);

    // ── 5. Patient ───────────────────────────────────────────────────────
    const patient = await Patient.create({
      userId: patientUser.id,
      organizationId: org.id,
      givenName: "Jane",
      familyName: "Demo",
      dateOfBirth: new Date("1990-06-15"),
      sexAtBirth: "female",
      mrn: "MRN-DEMO-0001",
      safetySummary: {
        criticalAllergyLabels: ["Penicillin"],
        activeMedCount: 2,
        criticalConditionLabels: [],
        updatedAt: new Date("2026-09-10"),
      },
      status: "active",
    });
    console.log(`Patient: ${patient.givenName} ${patient.familyName}`);

    // ── 6. Allergies ─────────────────────────────────────────────────────
    const allergyPenicillin = await Allergy.create({
      patientId: patient.id,
      organizationId: org.id,
      allergen: "Penicillin",
      reaction: "Severe allergic reaction — anaphylaxis, hives, throat swelling",
      severity: "severe",
      status: "active",
      safetyCritical: true,
      alwaysVisible: true,
    });

    const allergyPollen = await Allergy.create({
      patientId: patient.id,
      organizationId: org.id,
      allergen: "Tree Pollen",
      reaction: "Seasonal rhinitis, itchy eyes, mild congestion",
      severity: "mild",
      status: "active",
      safetyCritical: false,
      alwaysVisible: false,
    });

    console.log(
      `Allergies: ${allergyPenicillin.allergen} (safety-critical: ${allergyPenicillin.safetyCritical}), ${allergyPollen.allergen}`
    );

    // ── 7. Medications ───────────────────────────────────────────────────
    const medication1 = await Medication.create({
      patientId: patient.id,
      organizationId: org.id,
      medicationName: "Metformin",
      dosage: "500mg",
      frequency: "Twice daily with meals",
      status: "active",
      prescribingDoctor: doctor.id,
      startDate: new Date("2026-01-15"),
    });

    const medication2 = await Medication.create({
      patientId: patient.id,
      organizationId: org.id,
      medicationName: "Lisinopril",
      dosage: "10mg",
      frequency: "Once daily in the morning",
      status: "active",
      prescribingDoctor: doctor.id,
      startDate: new Date("2026-03-01"),
    });

    console.log(
      `Medications: ${medication1.medicationName}, ${medication2.medicationName}`
    );

    // ── 8. Medical History ───────────────────────────────────────────────
    const medHistory = await MedicalHistory.create({
      patientId: patient.id,
      organizationId: org.id,
      condition: "Type 2 Diabetes Mellitus",
      description:
        "Diagnosed via routine bloodwork. Managed with Metformin and lifestyle modifications. HbA1c within target range.",
      startDate: new Date("2025-08-20"),
      status: "active",
      doctorId: doctor.id,
    });
    console.log(`Medical History: ${medHistory.condition}`);

    // ── 9. Appointments ──────────────────────────────────────────────────
    const pastAppointment = await Appointment.create({
      patientId: patient.id,
      organizationId: org.id,
      doctorId: doctor.id,
      appointmentDate: new Date("2026-08-12T10:00:00Z"),
      status: "completed",
      type: "follow_up",
      reason: "Diabetes follow-up — review HbA1c results",
      notes:
        "HbA1c 6.8%. Patient reports good medication adherence. Continue current regimen.",
    });

    const upcomingAppointment = await Appointment.create({
      patientId: patient.id,
      organizationId: org.id,
      doctorId: doctor.id,
      appointmentDate: new Date("2026-09-25T14:30:00Z"),
      status: "scheduled",
      type: "consultation",
      reason: "Annual wellness check and medication review",
    });

    console.log(
      `Appointments: one completed (${pastAppointment.appointmentDate.toLocaleDateString()}), one upcoming (${upcomingAppointment.appointmentDate.toLocaleDateString()})`
    );

    // ── 10. Medical Report ───────────────────────────────────────────────
    const report = await MedicalReport.create({
      patientId: patient.id,
      organizationId: org.id,
      reportType: "Laboratory Results",
      reportDate: new Date("2026-08-12"),
      authorDoctorId: doctor.id,
      summary: "Routine metabolic panel and HbA1c for diabetes monitoring.",
      findings:
        "HbA1c: 6.8% (target <7.0%). Fasting glucose: 112 mg/dL. Creatinine: 0.9 mg/dL (normal). Lipid panel: LDL 98 mg/dL, HDL 62 mg/dL, triglycerides 130 mg/dL. All values within acceptable ranges. No signs of diabetic nephropathy.",
    });
    console.log(`Medical Report: ${report.reportType}`);

    // ── 11. Consent ──────────────────────────────────────────────────────
    const consent = await Consent.create({
      patientId: patient.id,
      organizationId: org.id,
      grantedToUserId: doctorUser.id,
      purpose: "Clinical care and appointment management",
      status: "active",
      grantedAt: new Date("2026-09-01"),
      expiresAt: new Date("2027-09-01"),
    });
    console.log(
      `Consent: active → ${consent.purpose}`
    );

    // ── 12. Emergency Access ─────────────────────────────────────────────
    const emergencyAccess = await EmergencyAccess.create({
      patientId: patient.id,
      organizationId: org.id,
      accessedByUserId: doctorUser.id,
      reason:
        "Patient presented to ED with severe allergic reaction. Immediate access to full medical history required for treatment.",
      startedAt: new Date("2026-09-10T08:15:00Z"),
      expiresAt: new Date("2026-09-10T20:15:00Z"),
      status: "active",
      notes: "Temporary 12-hour emergency access window",
    });
    console.log(`Emergency Access: ${emergencyAccess.status}`);

    // ── 13. Audit Logs ───────────────────────────────────────────────────
    await AuditLog.insertMany([
      {
        organizationId: org.id,
        actorUserId: doctorUser.id,
        patientId: patient.id,
        action: "view_profile",
        resourceType: "Patient",
        resourceId: patient.id,
        outcome: "success",
        reason: "Viewed patient profile before appointment",
        ipAddress: "192.168.1.100",
        userAgent: "Mozilla/5.0 (Demo Seed)",
        timestamp: new Date("2026-09-10T08:00:00Z"),
      },
      {
        organizationId: org.id,
        actorUserId: doctorUser.id,
        patientId: patient.id,
        action: "create_medication",
        resourceType: "Medication",
        resourceId: medication1.id,
        outcome: "success",
        reason: "Prescribed Metformin for Type 2 Diabetes management",
        metadata: { medicationName: "Metformin", dosage: "500mg" },
        ipAddress: "192.168.1.100",
        userAgent: "Mozilla/5.0 (Demo Seed)",
        timestamp: new Date("2026-09-10T08:30:00Z"),
      },
      {
        organizationId: org.id,
        actorUserId: doctorUser.id,
        patientId: patient.id,
        action: "access_report",
        resourceType: "MedicalReport",
        resourceId: report.id,
        outcome: "success",
        reason: "Reviewed laboratory results for diabetes monitoring",
        ipAddress: "192.168.1.100",
        userAgent: "Mozilla/5.0 (Demo Seed)",
        timestamp: new Date("2026-09-10T09:00:00Z"),
      },
      {
        organizationId: org.id,
        actorUserId: doctorUser.id,
        patientId: patient.id,
        action: "initiate_emergency_access",
        resourceType: "EmergencyAccess",
        resourceId: emergencyAccess.id,
        outcome: "success",
        reason:
          "Emergency access granted for anaphylaxis treatment — immediate access to medical history and allergy records",
        metadata: {
          accessWindow: "12 hours",
          trigger: "Allergic reaction presentation",
        },
        ipAddress: "192.168.1.100",
        userAgent: "Mozilla/5.0 (Demo Seed)",
        timestamp: new Date("2026-09-10T08:15:00Z"),
      },
    ]);
    console.log("Audit Logs: 4 records");

    // ── Summary ──────────────────────────────────────────────────────────
    console.log("\n════════════════════════════════════════════");
    console.log("  Seed complete — demo data created:");
    console.log("════════════════════════════════════════════");
    console.log(`  organizations:       1`);
    console.log(`  users:               3 (doctor, patient, admin)`);
    console.log(`  doctors:             1`);
    console.log(`  patients:            1`);
    console.log(`  allergies:           2 (1 safety-critical)`);
    console.log(`  medications:         2`);
    console.log(`  medical_histories:   1`);
    console.log(`  appointments:        2 (1 completed, 1 scheduled)`);
    console.log(`  medical_reports:     1`);
    console.log(`  consents:            1`);
    console.log(`  emergency_accesses:  1`);
    console.log(`  audit_logs:          4`);
    console.log("════════════════════════════════════════════\n");
  } catch (error) {
    console.error("Seed failed:", error.message || error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB disconnected");
  }
}

seed();
