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
import Appointment from "../models/Appointment.js";
import Medication from "../models/Medication.js";
import MedicalHistory from "../models/MedicalHistory.js";
import MedicalReport from "../models/MedicalReport.js";

dotenv.config({ path: ".env" });

describe("RBAC and Multi-Tenant Security Suite", () => {
  let orgA;
  let orgB;

  // Org A Users & Profiles
  let adminA, adminAToken;
  let adminA2, adminA2Token;
  let doctorA1, doctorA1Doc, doctorA1Token;
  let doctorA2, doctorA2Doc, doctorA2Token;
  let patientA1, patientA1Doc, patientA1Token;
  let patientA2, patientA2Doc, patientA2Token;

  // Org B Users & Profiles
  let adminB, adminBToken;
  let doctorB1, doctorB1Doc, doctorB1Token;
  let patientB1, patientB1Doc, patientB1Token;

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

    // Create 2 distinct organizations
    orgA = await Organization.create({
      name: `Hospital A ${testRunId}`,
      status: "active",
    });
    orgB = await Organization.create({
      name: `Hospital B ${testRunId}`,
      status: "active",
    });

    // Create Admin A1
    adminA = await User.create({
      organizationId: orgA._id,
      email: `admin.a.${testRunId}@test.com`,
      passwordHash,
      role: "admin",
      status: "active",
    });
    adminAToken = makeToken(adminA);

    // Create Admin A2 (for admin-modifies-admin testing)
    adminA2 = await User.create({
      organizationId: orgA._id,
      email: `admin.a2.${testRunId}@test.com`,
      passwordHash,
      role: "admin",
      status: "active",
    });
    adminA2Token = makeToken(adminA2);

    // Create Doctor A1
    doctorA1 = await User.create({
      organizationId: orgA._id,
      email: `dr.a1.${testRunId}@test.com`,
      passwordHash,
      role: "doctor",
      status: "active",
    });
    doctorA1Doc = await Doctor.create({
      userId: doctorA1._id,
      organizationId: orgA._id,
      displayName: "Dr. Alice Alpha",
      licenseNumber: `LIC-A1-${testRunId}`,
      specialties: ["Cardiology"],
      status: "active",
    });
    doctorA1Token = makeToken(doctorA1);

    // Create Doctor A2
    doctorA2 = await User.create({
      organizationId: orgA._id,
      email: `dr.a2.${testRunId}@test.com`,
      passwordHash,
      role: "doctor",
      status: "active",
    });
    doctorA2Doc = await Doctor.create({
      userId: doctorA2._id,
      organizationId: orgA._id,
      displayName: "Dr. Aaron Beta",
      licenseNumber: `LIC-A2-${testRunId}`,
      specialties: ["Neurology"],
      status: "active",
    });
    doctorA2Token = makeToken(doctorA2);

    // Create Patient A1
    patientA1 = await User.create({
      organizationId: orgA._id,
      email: `pat.a1.${testRunId}@test.com`,
      passwordHash,
      role: "patient",
      status: "active",
    });
    patientA1Doc = await Patient.create({
      userId: patientA1._id,
      organizationId: orgA._id,
      givenName: "John",
      familyName: "Doe",
      dateOfBirth: new Date("1985-05-15"),
      sexAtBirth: "male",
      status: "active",
    });
    patientA1Token = makeToken(patientA1);

    // Create Patient A2
    patientA2 = await User.create({
      organizationId: orgA._id,
      email: `pat.a2.${testRunId}@test.com`,
      passwordHash,
      role: "patient",
      status: "active",
    });
    patientA2Doc = await Patient.create({
      userId: patientA2._id,
      organizationId: orgA._id,
      givenName: "Jane",
      familyName: "Smith",
      dateOfBirth: new Date("1992-08-20"),
      sexAtBirth: "female",
      status: "active",
    });
    patientA2Token = makeToken(patientA2);

    // Org B Users & Profiles
    adminB = await User.create({
      organizationId: orgB._id,
      email: `admin.b.${testRunId}@test.com`,
      passwordHash,
      role: "admin",
      status: "active",
    });
    adminBToken = makeToken(adminB);

    doctorB1 = await User.create({
      organizationId: orgB._id,
      email: `dr.b1.${testRunId}@test.com`,
      passwordHash,
      role: "doctor",
      status: "active",
    });
    doctorB1Doc = await Doctor.create({
      userId: doctorB1._id,
      organizationId: orgB._id,
      displayName: "Dr. Bob Gamma",
      licenseNumber: `LIC-B1-${testRunId}`,
      specialties: ["General Practice"],
      status: "active",
    });
    doctorB1Token = makeToken(doctorB1);

    patientB1 = await User.create({
      organizationId: orgB._id,
      email: `pat.b1.${testRunId}@test.com`,
      passwordHash,
      role: "patient",
      status: "active",
    });
    patientB1Doc = await Patient.create({
      userId: patientB1._id,
      organizationId: orgB._id,
      givenName: "Bob",
      familyName: "Brown",
      dateOfBirth: new Date("1978-03-10"),
      sexAtBirth: "male",
      status: "active",
    });
    patientB1Token = makeToken(patientB1);
  });

  afterAll(async () => {
    const orgIds = [orgA?._id, orgB?._id].filter(Boolean);
    await Promise.all([
      User.deleteMany({ organizationId: { $in: orgIds } }),
      Patient.deleteMany({ organizationId: { $in: orgIds } }),
      Doctor.deleteMany({ organizationId: { $in: orgIds } }),
      Appointment.deleteMany({ organizationId: { $in: orgIds } }),
      Medication.deleteMany({ organizationId: { $in: orgIds } }),
      MedicalHistory.deleteMany({ organizationId: { $in: orgIds } }),
      MedicalReport.deleteMany({ organizationId: { $in: orgIds } }),
      Organization.deleteMany({ _id: { $in: orgIds } }),
    ]);
    await mongoose.disconnect();
  });

  // ── Authentication & Token Layer Checks ─────────────────────────────────────
  describe("Authentication & Authorization Gates", () => {
    it("should return 401 when token is missing", async () => {
      const res = await request(app).get("/api/patients");
      expect(res.status).toBe(401);
    });

    it("should return 403 when role is not allowed (patient calling GET /api/patients)", async () => {
      const res = await request(app)
        .get("/api/patients")
        .set("Authorization", `Bearer ${patientA1Token}`);
      expect(res.status).toBe(403);
      expect(res.body.message).toContain("Forbidden");
    });

    it("should return 403 when patient calls admin endpoint GET /api/admin/users", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${patientA1Token}`);
      expect(res.status).toBe(403);
    });

    it("should return 403 when doctor calls admin endpoint GET /api/admin/users", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${doctorA1Token}`);
      expect(res.status).toBe(403);
    });
  });

  // ── Patient Endpoints RBAC & Relationship Rules ─────────────────────────────
  describe("Patient Endpoints RBAC & Relationship Rules", () => {
    it("doctor with no relationship sees empty patient list in GET /api/patients", async () => {
      const res = await request(app)
        .get("/api/patients")
        .set("Authorization", `Bearer ${doctorA1Token}`);
      expect(res.status).toBe(200);
      expect(res.body.patients).toEqual([]);
    });

    it("admin sees all patients in own org in GET /api/patients", async () => {
      const res = await request(app)
        .get("/api/patients")
        .set("Authorization", `Bearer ${adminAToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.patients)).toBe(true);
      const ids = res.body.patients.map((p) => p._id.toString());
      expect(ids).toContain(patientA1Doc._id.toString());
      expect(ids).toContain(patientA2Doc._id.toString());
      expect(ids).not.toContain(patientB1Doc._id.toString());
    });

    it("patient can access own profile GET /api/patients/:patientId", async () => {
      const res = await request(app)
        .get(`/api/patients/${patientA1Doc._id}`)
        .set("Authorization", `Bearer ${patientA1Token}`);
      expect(res.status).toBe(200);
      expect(res.body.patient._id.toString()).toBe(patientA1Doc._id.toString());
      expect(res.body.patient.givenName).toBe("John");
    });

    it("patient cannot access another patient's profile (returns 404)", async () => {
      const res = await request(app)
        .get(`/api/patients/${patientA2Doc._id}`)
        .set("Authorization", `Bearer ${patientA1Token}`);
      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Patient not found.");
    });

    it("doctor without relationship gets 404 when accessing patient profile", async () => {
      const res = await request(app)
        .get(`/api/patients/${patientA1Doc._id}`)
        .set("Authorization", `Bearer ${doctorA1Token}`);
      expect(res.status).toBe(404);
    });

    it("doctor can establish relationship by creating an appointment (server-side doctorId override)", async () => {
      const fakeDoctorId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post(`/api/patients/${patientA1Doc._id}/appointments`)
        .set("Authorization", `Bearer ${doctorA1Token}`)
        .send({
          appointmentDate: new Date().toISOString(),
          reason: "Cardiology follow-up",
          doctorId: fakeDoctorId, // Attempted spoofing
        });

      expect(res.status).toBe(201);
      expect(res.body.appointment).toBeDefined();
      // Must be set server-side to doctorA1Doc._id, NOT fakeDoctorId
      expect(res.body.appointment.doctorId.toString()).toBe(
        doctorA1Doc._id.toString()
      );
      expect(res.body.appointment.organizationId.toString()).toBe(
        orgA._id.toString()
      );
    });

    it("doctor now has clinical relationship with patientA1 and can view profile", async () => {
      const res = await request(app)
        .get(`/api/patients/${patientA1Doc._id}`)
        .set("Authorization", `Bearer ${doctorA1Token}`);
      expect(res.status).toBe(200);
      expect(res.body.patient._id.toString()).toBe(patientA1Doc._id.toString());
    });

    it("doctorA2 still has no relationship and gets 404 for patientA1", async () => {
      const res = await request(app)
        .get(`/api/patients/${patientA1Doc._id}`)
        .set("Authorization", `Bearer ${doctorA2Token}`);
      expect(res.status).toBe(404);
    });

    it("doctorA1 now sees patientA1 in GET /api/patients list", async () => {
      const res = await request(app)
        .get("/api/patients")
        .set("Authorization", `Bearer ${doctorA1Token}`);
      expect(res.status).toBe(200);
      const ids = res.body.patients.map((p) => p._id.toString());
      expect(ids).toContain(patientA1Doc._id.toString());
      expect(ids).not.toContain(patientA2Doc._id.toString());
    });

    it("patient cannot PUT /api/patients/:patientId (403 admin only)", async () => {
      const res = await request(app)
        .put(`/api/patients/${patientA1Doc._id}`)
        .set("Authorization", `Bearer ${patientA1Token}`)
        .send({ givenName: "Hacked" });
      expect(res.status).toBe(403);
    });

    it("doctor cannot PUT /api/patients/:patientId (403 admin only)", async () => {
      const res = await request(app)
        .put(`/api/patients/${patientA1Doc._id}`)
        .set("Authorization", `Bearer ${doctorA1Token}`)
        .send({ givenName: "Hacked" });
      expect(res.status).toBe(403);
    });

    it("admin CAN PUT /api/patients/:patientId", async () => {
      const res = await request(app)
        .put(`/api/patients/${patientA1Doc._id}`)
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({ givenName: "Johnny" });
      expect(res.status).toBe(200);
      expect(res.body.patient.givenName).toBe("Johnny");
    });
  });

  // ── Clinical Nested Resources & Server-Side Security ────────────────────────
  describe("Clinical Nested Resources & Server-Side Security", () => {
    it("doctor POST medication establishes prescribingDoctor server-side", async () => {
      const fakeDoctorId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post(`/api/patients/${patientA1Doc._id}/medications`)
        .set("Authorization", `Bearer ${doctorA1Token}`)
        .send({
          medicationName: "Atorvastatin",
          dosage: "20mg",
          prescribingDoctor: fakeDoctorId,
        });

      expect(res.status).toBe(201);
      expect(res.body.medication.prescribingDoctor.toString()).toBe(
        doctorA1Doc._id.toString()
      );
    });

    it("patient can GET own medications", async () => {
      const res = await request(app)
        .get(`/api/patients/${patientA1Doc._id}/medications`)
        .set("Authorization", `Bearer ${patientA1Token}`);
      expect(res.status).toBe(200);
      expect(res.body.medications.length).toBeGreaterThan(0);
      expect(res.body.medications[0].medicationName).toBe("Atorvastatin");
    });

    it("unrelated doctor GET medications returns 404", async () => {
      const res = await request(app)
        .get(`/api/patients/${patientA1Doc._id}/medications`)
        .set("Authorization", `Bearer ${doctorA2Token}`);
      expect(res.status).toBe(404);
    });

    it("doctor POST medical-history sets doctorId server-side", async () => {
      const fakeDoctorId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post(`/api/patients/${patientA1Doc._id}/medical-histories`)
        .set("Authorization", `Bearer ${doctorA1Token}`)
        .send({
          condition: "Hypertension",
          startDate: new Date("2020-01-01").toISOString(),
          doctorId: fakeDoctorId,
        });

      expect(res.status).toBe(201);
      expect(res.body.medicalHistory.doctorId.toString()).toBe(
        doctorA1Doc._id.toString()
      );
    });

    it("doctor POST medical-report sets authorDoctorId server-side", async () => {
      const fakeDoctorId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post(`/api/patients/${patientA1Doc._id}/medical-reports`)
        .set("Authorization", `Bearer ${doctorA1Token}`)
        .send({
          reportType: "Echocardiogram",
          reportDate: new Date().toISOString(),
          summary: "Normal left ventricular ejection fraction.",
          authorDoctorId: fakeDoctorId,
        });

      expect(res.status).toBe(201);
      expect(res.body.medicalReport.authorDoctorId.toString()).toBe(
        doctorA1Doc._id.toString()
      );
    });

    it("patient cannot POST clinical resources (403 doctor only)", async () => {
      const res = await request(app)
        .post(`/api/patients/${patientA1Doc._id}/medications`)
        .set("Authorization", `Bearer ${patientA1Token}`)
        .send({ medicationName: "Self-prescribed Aspirin" });
      expect(res.status).toBe(403);
    });

    it("admin can GET clinical resources of patients in org", async () => {
      const res = await request(app)
        .get(`/api/patients/${patientA1Doc._id}/medical-reports`)
        .set("Authorization", `Bearer ${adminAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.medicalReports.length).toBeGreaterThan(0);
    });
  });

  // ── Doctor Directory & Profile Endpoints ────────────────────────────────────
  describe("Doctor Endpoints RBAC", () => {
    it("patient cannot list doctors GET /api/doctors", async () => {
      const res = await request(app)
        .get("/api/doctors")
        .set("Authorization", `Bearer ${patientA1Token}`);
      expect(res.status).toBe(403);
    });

    it("doctor cannot list doctors GET /api/doctors", async () => {
      const res = await request(app)
        .get("/api/doctors")
        .set("Authorization", `Bearer ${doctorA1Token}`);
      expect(res.status).toBe(403);
    });

    it("admin can list doctors GET /api/doctors", async () => {
      const res = await request(app)
        .get("/api/doctors")
        .set("Authorization", `Bearer ${adminAToken}`);
      expect(res.status).toBe(200);
    });

    it("patient cannot update doctor profile PUT /api/doctors/:doctorId", async () => {
      const res = await request(app)
        .put(`/api/doctors/${doctorA1Doc._id}`)
        .set("Authorization", `Bearer ${patientA1Token}`)
        .send({ displayName: "Dr. Patient Edited" });
      expect(res.status).toBe(403);
    });

    it("doctor cannot update own profile PUT /api/doctors/:doctorId", async () => {
      const res = await request(app)
        .put(`/api/doctors/${doctorA1Doc._id}`)
        .set("Authorization", `Bearer ${doctorA1Token}`)
        .send({ displayName: "Dr. Alice Alpha, MD" });
      expect(res.status).toBe(403);
    });

    it("admin can update doctor profile PUT /api/doctors/:doctorId", async () => {
      const res = await request(app)
        .put(`/api/doctors/${doctorA2Doc._id}`)
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({ specialties: ["Neurology", "Neurocritical Care"] });
      expect(res.status).toBe(200);
      expect(res.body.doctor.specialties).toContain("Neurocritical Care");
    });
  });

  // ── Admin Endpoints & Boundary Protections ──────────────────────────────────
  describe("Admin Endpoints & Constraints", () => {
    it("admin can list all users in organization GET /api/admin/users", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${adminAToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.users)).toBe(true);
      const emails = res.body.users.map((u) => u.email);
      expect(emails).toContain(patientA1.email);
      expect(emails).toContain(doctorA1.email);
      expect(emails).not.toContain(patientB1.email);
    });

    it("admin can update user status (e.g. suspend a patient)", async () => {
      const res = await request(app)
        .put(`/api/admin/users/${patientA2._id}/status`)
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({ status: "suspended" });

      expect(res.status).toBe(200);
      expect(res.body.user.status).toBe("suspended");

      // Verify suspended patient token is now rejected on protected route
      const verifyRes = await request(app)
        .get(`/api/patients/${patientA2Doc._id}`)
        .set("Authorization", `Bearer ${patientA2Token}`);
      expect(verifyRes.status).toBe(401);
    });

    it("admin CANNOT suspend self (400 bad request)", async () => {
      const res = await request(app)
        .put(`/api/admin/users/${adminA._id}/status`)
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({ status: "suspended" });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("cannot modify own");
    });

    it("admin CANNOT modify/suspend another admin (403 forbidden)", async () => {
      const res = await request(app)
        .put(`/api/admin/users/${adminA2._id}/status`)
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({ status: "suspended" });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain("another admin");
    });

    it("admin can get org stats GET /api/admin/stats", async () => {
      const res = await request(app)
        .get("/api/admin/stats")
        .set("Authorization", `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.stats).toBeDefined();
      expect(typeof res.body.stats.totalUsers).toBe("number");
      expect(typeof res.body.stats.totalPatients).toBe("number");
      expect(typeof res.body.stats.totalDoctors).toBe("number");
      expect(typeof res.body.stats.totalAppointments).toBe("number");
    });
  });

  // ── Multi-Tenant Cross-Organization Isolation ───────────────────────────────
  describe("Multi-Tenant Cross-Organization Isolation", () => {
    it("admin from Org A cannot see Org B patients (returns 404)", async () => {
      const res = await request(app)
        .get(`/api/patients/${patientB1Doc._id}`)
        .set("Authorization", `Bearer ${adminAToken}`);
      expect(res.status).toBe(404);
    });

    it("doctor from Org A cannot see Org B doctor profile (returns 404)", async () => {
      const res = await request(app)
        .get(`/api/doctors/${doctorB1Doc._id}`)
        .set("Authorization", `Bearer ${doctorA1Token}`);
      expect(res.status).toBe(404);
    });

    it("admin from Org A cannot modify Org B user status (returns 404)", async () => {
      const res = await request(app)
        .put(`/api/admin/users/${patientB1._id}/status`)
        .set("Authorization", `Bearer ${adminAToken}`)
        .send({ status: "suspended" });
      expect(res.status).toBe(404);
    });

    it("doctor from Org A cannot create appointments for Org B patient (returns 404)", async () => {
      const res = await request(app)
        .post(`/api/patients/${patientB1Doc._id}/appointments`)
        .set("Authorization", `Bearer ${doctorA1Token}`)
        .send({
          appointmentDate: new Date().toISOString(),
          reason: "Cross-org attack attempt",
        });
      expect(res.status).toBe(404);
    });
  });
});
