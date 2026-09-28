import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { app } from "../index.js";

import User from "../models/User.js";
import Organization from "../models/Organization.js";
import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";
import Consent from "../models/Consent.js";
import EmergencyAccess from "../models/EmergencyAccess.js";
import Appointment from "../models/Appointment.js";

dotenv.config({ path: ".env" });

describe("Phase 3 & 4: Consent, Emergency Access, and Audit", () => {
  let org;

  // Users & Profiles
  let admin, adminToken;
  let doctor1, doctor1Doc, doctor1Token;
  let doctor2, doctor2Doc, doctor2Token;
  let patient1, patient1Doc, patient1Token;
  let patient2, patient2Doc, patient2Token;

  const password = "SecurePassword123!";
  const testRunId = Date.now();

  function makeToken(user) {
    return jwt.sign(
      {
        userId: user._id.toString(),
        organizationId: user.organizationId.toString(),
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
  }

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    org = await Organization.create({
      name: `Consent Test Hospital ${testRunId}`,
      status: "active",
    });

    // Admin
    admin = await User.create({
      organizationId: org._id,
      email: `admin.consent.${testRunId}@test.com`,
      passwordHash,
      role: "admin",
      status: "active",
    });
    adminToken = makeToken(admin);

    // Doctor 1
    doctor1 = await User.create({
      organizationId: org._id,
      email: `dr1.consent.${testRunId}@test.com`,
      passwordHash,
      role: "doctor",
      status: "active",
    });
    doctor1Doc = await Doctor.create({
      userId: doctor1._id,
      organizationId: org._id,
      displayName: "Dr. Consent Alpha",
      licenseNumber: `LIC-CA-${testRunId}`,
      specialties: ["Cardiology"],
      status: "active",
    });
    doctor1Token = makeToken(doctor1);

    // Doctor 2
    doctor2 = await User.create({
      organizationId: org._id,
      email: `dr2.consent.${testRunId}@test.com`,
      passwordHash,
      role: "doctor",
      status: "active",
    });
    doctor2Doc = await Doctor.create({
      userId: doctor2._id,
      organizationId: org._id,
      displayName: "Dr. Consent Beta",
      licenseNumber: `LIC-CB-${testRunId}`,
      specialties: ["Neurology"],
      status: "active",
    });
    doctor2Token = makeToken(doctor2);

    // Patient 1
    patient1 = await User.create({
      organizationId: org._id,
      email: `pat1.consent.${testRunId}@test.com`,
      passwordHash,
      role: "patient",
      status: "active",
    });
    patient1Doc = await Patient.create({
      userId: patient1._id,
      organizationId: org._id,
      givenName: "Alice",
      familyName: "Consent",
      dateOfBirth: new Date("1990-01-15"),
      sexAtBirth: "female",
      status: "active",
    });
    patient1Token = makeToken(patient1);

    // Patient 2
    patient2 = await User.create({
      organizationId: org._id,
      email: `pat2.consent.${testRunId}@test.com`,
      passwordHash,
      role: "patient",
      status: "active",
    });
    patient2Doc = await Patient.create({
      userId: patient2._id,
      organizationId: org._id,
      givenName: "Bob",
      familyName: "Consent",
      dateOfBirth: new Date("1985-06-20"),
      sexAtBirth: "male",
      status: "active",
    });
    patient2Token = makeToken(patient2);

    // Create an appointment so doctor1 has clinical relationship with patient1
    await Appointment.create({
      patientId: patient1Doc._id,
      organizationId: org._id,
      doctorId: doctor1Doc._id,
      appointmentDate: new Date(),
      status: "scheduled",
      type: "consultation",
      reason: "Initial consultation",
    });
  });

  afterAll(async () => {
    const orgIds = [org?._id].filter(Boolean);
    await Promise.all([
      User.deleteMany({ organizationId: { $in: orgIds } }),
      Patient.deleteMany({ organizationId: { $in: orgIds } }),
      Doctor.deleteMany({ organizationId: { $in: orgIds } }),
      Consent.deleteMany({ organizationId: { $in: orgIds } }),
      EmergencyAccess.deleteMany({ organizationId: { $in: orgIds } }),
      Appointment.deleteMany({ organizationId: { $in: orgIds } }),
      Organization.deleteMany({ _id: { $in: orgIds } }),
    ]);
    await mongoose.disconnect();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 3 — CONSENT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Consent API — Grant Consent", () => {
    it("patient can grant consent to a doctor", async () => {
      const res = await request(app)
        .post("/api/consents")
        .set("Authorization", `Bearer ${patient1Token}`)
        .send({
          doctorUserId: doctor1._id.toString(),
          purpose: "Cardiology consultation",
        });

      expect(res.status).toBe(201);
      expect(res.body.consent).toBeDefined();
      expect(res.body.consent.status).toBe("active");
      expect(res.body.consent.patientId.toString()).toBe(patient1Doc._id.toString());
      expect(res.body.consent.grantedToUserId.toString()).toBe(doctor1._id.toString());
    });

    it("patient cannot grant duplicate active consent to same doctor", async () => {
      const res = await request(app)
        .post("/api/consents")
        .set("Authorization", `Bearer ${patient1Token}`)
        .send({
          doctorUserId: doctor1._id.toString(),
          purpose: "Duplicate attempt",
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain("already exists");
    });

    it("doctor cannot grant consent (role restriction)", async () => {
      const res = await request(app)
        .post("/api/consents")
        .set("Authorization", `Bearer ${doctor1Token}`)
        .send({
          doctorUserId: doctor2._id.toString(),
          purpose: "Invalid",
        });

      expect(res.status).toBe(403);
    });

    it("admin cannot grant consent (role restriction)", async () => {
      const res = await request(app)
        .post("/api/consents")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          doctorUserId: doctor1._id.toString(),
          purpose: "Invalid",
        });

      expect(res.status).toBe(403);
    });

    it("returns 400 when doctorUserId is missing", async () => {
      const res = await request(app)
        .post("/api/consents")
        .set("Authorization", `Bearer ${patient1Token}`)
        .send({ purpose: "Missing doctor" });

      expect(res.status).toBe(400);
    });

    it("returns 400 when purpose is missing", async () => {
      const res = await request(app)
        .post("/api/consents")
        .set("Authorization", `Bearer ${patient1Token}`)
        .send({ doctorUserId: doctor1._id.toString() });

      expect(res.status).toBe(400);
    });

    it("returns 404 when doctor does not exist", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post("/api/consents")
        .set("Authorization", `Bearer ${patient1Token}`)
        .send({
          doctorUserId: fakeId,
          purpose: "Non-existent doctor",
        });

      expect(res.status).toBe(404);
    });
  });

  describe("Consent API — List Consents", () => {
    it("patient can list own consents", async () => {
      const res = await request(app)
        .get("/api/consents")
        .set("Authorization", `Bearer ${patient1Token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.consents)).toBe(true);
      expect(res.body.consents.length).toBeGreaterThan(0);
    });

    it("doctor can see consents granted to them", async () => {
      const res = await request(app)
        .get("/api/consents")
        .set("Authorization", `Bearer ${doctor1Token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.consents)).toBe(true);
      expect(res.body.consents.length).toBeGreaterThan(0);
      expect(res.body.consents[0].grantedToUserId.toString()).toBe(doctor1._id.toString());
    });

    it("doctor2 sees no consents (none granted to them)", async () => {
      const res = await request(app)
        .get("/api/consents")
        .set("Authorization", `Bearer ${doctor2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.consents).toEqual([]);
    });

    it("admin can see all consents in org", async () => {
      const res = await request(app)
        .get("/api/consents")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.consents)).toBe(true);
      expect(res.body.consents.length).toBeGreaterThan(0);
    });
  });

  describe("Consent API — Get Consent by ID", () => {
    let consentId;

    beforeAll(async () => {
      const consent = await Consent.findOne({
        patientId: patient1Doc._id,
        grantedToUserId: doctor1._id,
        status: "active",
      }).lean();
      consentId = consent._id.toString();
    });

    it("patient can get own consent by ID", async () => {
      const res = await request(app)
        .get(`/api/consents/${consentId}`)
        .set("Authorization", `Bearer ${patient1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.consent._id.toString()).toBe(consentId);
    });

    it("doctor can get consent granted to them by ID", async () => {
      const res = await request(app)
        .get(`/api/consents/${consentId}`)
        .set("Authorization", `Bearer ${doctor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.consent._id.toString()).toBe(consentId);
    });

    it("doctor2 cannot see consent not granted to them", async () => {
      const res = await request(app)
        .get(`/api/consents/${consentId}`)
        .set("Authorization", `Bearer ${doctor2Token}`);

      expect(res.status).toBe(404);
    });
  });

  describe("Consent Gate — Chart Access Requires Consent", () => {
    it("doctor with relationship but NO consent cannot access patient chart", async () => {
      // doctor2 has no consent from patient1
      const res = await request(app)
        .get(`/api/patients/${patient1Doc._id}`)
        .set("Authorization", `Bearer ${doctor2Token}`);

      expect(res.status).toBe(404); // No clinical relationship, so 404
    });

    it("doctor with relationship AND consent CAN access patient chart", async () => {
      const res = await request(app)
        .get(`/api/patients/${patient1Doc._id}`)
        .set("Authorization", `Bearer ${doctor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.patient._id.toString()).toBe(patient1Doc._id.toString());
    });

    it("patient can always access own chart (no consent needed)", async () => {
      const res = await request(app)
        .get(`/api/patients/${patient1Doc._id}`)
        .set("Authorization", `Bearer ${patient1Token}`);

      expect(res.status).toBe(200);
    });

    it("admin can access any patient chart (no consent needed)", async () => {
      const res = await request(app)
        .get(`/api/patients/${patient1Doc._id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe("Consent API — Revoke Consent", () => {
    let consentId;

    beforeAll(async () => {
      const consent = await Consent.findOne({
        patientId: patient1Doc._id,
        grantedToUserId: doctor1._id,
        status: "active",
      }).lean();
      consentId = consent._id.toString();
    });

    it("patient can revoke own consent", async () => {
      const res = await request(app)
        .put(`/api/consents/${consentId}/revoke`)
        .set("Authorization", `Bearer ${patient1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.consent.status).toBe("revoked");
      expect(res.body.consent.revokedAt).toBeDefined();
    });

    it("revoked consent is returned as 400 on double revoke", async () => {
      const res = await request(app)
        .put(`/api/consents/${consentId}/revoke`)
        .set("Authorization", `Bearer ${patient1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("already revoked");
    });

    it("doctor loses chart access after consent is revoked", async () => {
      const res = await request(app)
        .get(`/api/patients/${patient1Doc._id}`)
        .set("Authorization", `Bearer ${doctor1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain("consent");
    });

    it("doctor cannot revoke consent (patient only)", async () => {
      // Create a new consent first
      const newConsent = await request(app)
        .post("/api/consents")
        .set("Authorization", `Bearer ${patient1Token}`)
        .send({
          doctorUserId: doctor1._id.toString(),
          purpose: "For revoke test",
        });

      const res = await request(app)
        .put(`/api/consents/${newConsent.body.consent._id}/revoke`)
        .set("Authorization", `Bearer ${doctor1Token}`);

      expect(res.status).toBe(403);
    });
  });

  describe("Consent Gate — Expired Consent", () => {
    let expiredConsentId;

    it("expired consent does not grant access", async () => {
      // Create a consent that is already expired
      const consent = await Consent.create({
        patientId: patient1Doc._id,
        organizationId: org._id,
        grantedToUserId: doctor2._id,
        purpose: "Expired test",
        status: "active",
        grantedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        expiresAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago (expired)
      });
      expiredConsentId = consent._id;

      // Create clinical relationship for doctor2
      await Appointment.create({
        patientId: patient1Doc._id,
        organizationId: org._id,
        doctorId: doctor2Doc._id,
        appointmentDate: new Date(),
        status: "scheduled",
        type: "consultation",
        reason: "Test for expired consent",
      });

      const res = await request(app)
        .get(`/api/patients/${patient1Doc._id}`)
        .set("Authorization", `Bearer ${doctor2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain("consent");
    });

    afterAll(async () => {
      if (expiredConsentId) {
        await Consent.deleteOne({ _id: expiredConsentId });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 4 — EMERGENCY ACCESS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Emergency Access API — Initiate", () => {
    it("doctor can initiate emergency access", async () => {
      const res = await request(app)
        .post("/api/emergency-access")
        .set("Authorization", `Bearer ${doctor2Token}`)
        .send({
          patientId: patient1Doc._id.toString(),
          reason: "Patient in critical condition, unable to obtain consent",
        });

      expect(res.status).toBe(201);
      expect(res.body.emergencyAccess).toBeDefined();
      expect(res.body.emergencyAccess.status).toBe("active");
      expect(res.body.emergencyAccess.accessedByUserId.toString()).toBe(doctor2._id.toString());
    });

    it("doctor cannot create duplicate emergency access", async () => {
      const res = await request(app)
        .post("/api/emergency-access")
        .set("Authorization", `Bearer ${doctor2Token}`)
        .send({
          patientId: patient1Doc._id.toString(),
          reason: "Duplicate attempt",
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain("already exists");
    });

    it("patient cannot initiate emergency access (role restriction)", async () => {
      const res = await request(app)
        .post("/api/emergency-access")
        .set("Authorization", `Bearer ${patient1Token}`)
        .send({
          patientId: patient1Doc._id.toString(),
          reason: "Invalid",
        });

      expect(res.status).toBe(403);
    });

    it("admin cannot initiate emergency access (role restriction)", async () => {
      const res = await request(app)
        .post("/api/emergency-access")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          patientId: patient1Doc._id.toString(),
          reason: "Invalid",
        });

      expect(res.status).toBe(403);
    });

    it("returns 400 when patientId is missing", async () => {
      const res = await request(app)
        .post("/api/emergency-access")
        .set("Authorization", `Bearer ${doctor1Token}`)
        .send({ reason: "Missing patient" });

      expect(res.status).toBe(400);
    });

    it("returns 400 when reason is missing", async () => {
      const res = await request(app)
        .post("/api/emergency-access")
        .set("Authorization", `Bearer ${doctor1Token}`)
        .send({ patientId: patient1Doc._id.toString() });

      expect(res.status).toBe(400);
    });

    it("returns 404 when patient does not exist", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post("/api/emergency-access")
        .set("Authorization", `Bearer ${doctor1Token}`)
        .send({
          patientId: fakeId,
          reason: "Non-existent patient",
        });

      expect(res.status).toBe(404);
    });
  });

  describe("Emergency Access API — Bypasses Consent", () => {
    it("doctor with emergency access CAN access patient chart WITHOUT consent", async () => {
      // doctor2 has no consent from patient1, but has emergency access
      const res = await request(app)
        .get(`/api/patients/${patient1Doc._id}`)
        .set("Authorization", `Bearer ${doctor2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.patient._id.toString()).toBe(patient1Doc._id.toString());
    });

    it("doctor with emergency access can view clinical resources", async () => {
      const res = await request(app)
        .get(`/api/patients/${patient1Doc._id}/appointments`)
        .set("Authorization", `Bearer ${doctor2Token}`);

      expect(res.status).toBe(200);
    });
  });

  describe("Emergency Access API — List and Check", () => {
    it("doctor can list own emergency accesses", async () => {
      const res = await request(app)
        .get("/api/emergency-access")
        .set("Authorization", `Bearer ${doctor2Token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.emergencyAccesses)).toBe(true);
      expect(res.body.emergencyAccesses.length).toBeGreaterThan(0);
    });

    it("admin can list all emergency accesses in org", async () => {
      const res = await request(app)
        .get("/api/emergency-access")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.emergencyAccesses.length).toBeGreaterThan(0);
    });

    it("doctor can check active emergency access for a patient", async () => {
      const res = await request(app)
        .get(`/api/emergency-access/check/${patient1Doc._id}`)
        .set("Authorization", `Bearer ${doctor2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.hasAccess).toBe(true);
      expect(res.body.emergencyAccess).toBeDefined();
    });

    it("doctor1 has no emergency access for patient1", async () => {
      const res = await request(app)
        .get(`/api/emergency-access/check/${patient1Doc._id}`)
        .set("Authorization", `Bearer ${doctor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.hasAccess).toBe(false);
    });
  });

  describe("Emergency Access API — End Access", () => {
    let accessId;

    beforeAll(async () => {
      const access = await EmergencyAccess.findOne({
        accessedByUserId: doctor2._id,
        patientId: patient1Doc._id,
        status: "active",
      }).lean();
      accessId = access._id.toString();
    });

    it("doctor can end own emergency access early", async () => {
      const res = await request(app)
        .put(`/api/emergency-access/${accessId}/end`)
        .set("Authorization", `Bearer ${doctor2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.emergencyAccess.status).toBe("ended");
      expect(res.body.emergencyAccess.endedAt).toBeDefined();
    });

    it("doctor loses chart access after emergency access ends", async () => {
      const res = await request(app)
        .get(`/api/patients/${patient1Doc._id}`)
        .set("Authorization", `Bearer ${doctor2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain("consent");
    });

    it("returns 404 for already ended emergency access", async () => {
      const res = await request(app)
        .put(`/api/emergency-access/${accessId}/end`)
        .set("Authorization", `Bearer ${doctor2Token}`);

      expect(res.status).toBe(404);
    });
  });

  describe("Emergency Access API — Duration Limits", () => {
    it("respects minimum duration of 5 minutes", async () => {
      const res = await request(app)
        .post("/api/emergency-access")
        .set("Authorization", `Bearer ${doctor1Token}`)
        .send({
          patientId: patient2Doc._id.toString(),
          reason: "Duration test",
          durationMinutes: 1,
        });

      expect(res.status).toBe(201);
      const expiresAt = new Date(res.body.emergencyAccess.expiresAt);
      const startedAt = new Date(res.body.emergencyAccess.startedAt);
      const diffMinutes = (expiresAt - startedAt) / (1000 * 60);
      expect(diffMinutes).toBeGreaterThanOrEqual(5);
    });

    it("respects maximum duration of 480 minutes", async () => {
      const res = await request(app)
        .post("/api/emergency-access")
        .set("Authorization", `Bearer ${doctor1Token}`)
        .send({
          patientId: patient2Doc._id.toString(),
          reason: "Long duration test",
          durationMinutes: 1000,
        });

      expect(res.status).toBe(201);
      const expiresAt = new Date(res.body.emergencyAccess.expiresAt);
      const startedAt = new Date(res.body.emergencyAccess.startedAt);
      const diffMinutes = (expiresAt - startedAt) / (1000 * 60);
      expect(diffMinutes).toBeLessThanOrEqual(480);
    });

    afterAll(async () => {
      // Clean up emergency accesses for patient2
      await EmergencyAccess.deleteMany({
        patientId: patient2Doc._id,
        organizationId: org._id,
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 4 — AUDIT LOG TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Audit Log API", () => {
    it("admin can list audit logs", async () => {
      const res = await request(app)
        .get("/api/audit-logs")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.auditLogs)).toBe(true);
      expect(typeof res.body.total).toBe("number");
    });

    it("admin can filter audit logs by action", async () => {
      const res = await request(app)
        .get("/api/audit-logs?action=consent_granted")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.auditLogs)).toBe(true);
    });

    it("admin can get audit log stats", async () => {
      const res = await request(app)
        .get("/api/audit-logs/stats/summary")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.stats).toBeDefined();
      expect(typeof res.body.stats.total).toBe("number");
    });

    it("doctor cannot access audit logs (admin only)", async () => {
      const res = await request(app)
        .get("/api/audit-logs")
        .set("Authorization", `Bearer ${doctor1Token}`);

      expect(res.status).toBe(403);
    });

    it("patient cannot access audit logs (admin only)", async () => {
      const res = await request(app)
        .get("/api/audit-logs")
        .set("Authorization", `Bearer ${patient1Token}`);

      expect(res.status).toBe(403);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MULTI-TENANT ISOLATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Multi-Tenant Isolation", () => {
    let otherOrg, otherPatient, otherPatientDoc, otherToken;

    beforeAll(async () => {
      const passwordHash = await bcrypt.hash(password, 10);
      otherOrg = await Organization.create({
        name: `Other Org ${testRunId}`,
        status: "active",
      });
      otherPatient = await User.create({
        organizationId: otherOrg._id,
        email: `other.pat.${testRunId}@test.com`,
        passwordHash,
        role: "patient",
        status: "active",
      });
      otherPatientDoc = await Patient.create({
        userId: otherPatient._id,
        organizationId: otherOrg._id,
        givenName: "Other",
        familyName: "Patient",
        dateOfBirth: new Date("2000-01-01"),
        status: "active",
      });
      otherToken = makeToken(otherPatient);
    });

    afterAll(async () => {
      if (otherOrg) {
        await Promise.all([
          User.deleteMany({ organizationId: otherOrg._id }),
          Patient.deleteMany({ organizationId: otherOrg._id }),
          Consent.deleteMany({ organizationId: otherOrg._id }),
          EmergencyAccess.deleteMany({ organizationId: otherOrg._id }),
          Organization.deleteOne({ _id: otherOrg._id }),
        ]);
      }
    });

    it("patient cannot grant consent to doctor in different org", async () => {
      const res = await request(app)
        .post("/api/consents")
        .set("Authorization", `Bearer ${otherToken}`)
        .send({
          doctorUserId: doctor1._id.toString(),
          purpose: "Cross-org attempt",
        });

      expect(res.status).toBe(404);
    });

    it("consents are isolated by org", async () => {
      const res = await request(app)
        .get("/api/consents")
        .set("Authorization", `Bearer ${otherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.consents).toEqual([]);
    });
  });
});
