import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { app } from "../index.js";
import User from "../models/User.js";
import Organization from "../models/Organization.js";
import Patient from "../models/Patient.js";

dotenv.config({ path: ".env" });

describe("Authentication API", () => {
  let orgId;
  let testUserToken = null;
  const testEmail = `test.user.${Date.now()}@example.com`;
  const duplicateEmail = `dup.${Date.now()}@example.com`;
  const password = "SecurePassword123!";

  beforeAll(async () => {
    // Avoid overriding main connection, just ensure we use it
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
      });
    }

    // Attempt to get an organization
    const org = await Organization.findOne({ status: "active" });
    if (!org) {
       const newOrg = await Organization.create({ name: "Test Org", status: "active" });
       orgId = newOrg._id.toString();
    } else {
       orgId = org._id.toString();
    }
  });

  afterAll(async () => {
    // Cleanup generated mock data
    const user = await User.findOne({ email: testEmail });
    if (user) {
      await Patient.deleteOne({ userId: user._id });
      await User.deleteOne({ _id: user._id });
    }
    const dupUser = await User.findOne({ email: duplicateEmail });
    if (dupUser) {
      await Patient.deleteOne({ userId: dupUser._id });
      await User.deleteOne({ _id: dupUser._id });
    }
    await mongoose.disconnect();
  });

  it("should block admin registration", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: "admin.hack@example.com",
        password: "HackPassword123!",
        role: "admin",
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Cannot register as admin through public registration");
  });

  it("should fail registration with short password", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: "short@example.com",
        password: "short",
        role: "patient",
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Password must be at least 8 characters long");
  });

  it("should successfully register a new patient", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: testEmail,
        password,
        role: "patient",
        givenName: "Test",
        familyName: "User",
        dateOfBirth: "1990-01-01",
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Registration successful.");
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testEmail.toLowerCase());

    // Security check: Never return passwordHash
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.user.password).toBeUndefined();
  });

  it("should reject duplicate registration without enumerating user", async () => {
    // First registration
    await request(app).post("/api/auth/register").send({
      email: duplicateEmail,
      password,
      role: "patient",
      givenName: "Dup",
      familyName: "User",
      dateOfBirth: "1990-01-01"
    });

    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: duplicateEmail,
        password,
        role: "patient",
        givenName: "Dup2",
        familyName: "User",
        dateOfBirth: "1990-01-01"
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Email already in use.");
  });

  it("should login successfully with valid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: testEmail,
        password,
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.passwordHash).toBeUndefined();
    testUserToken = res.body.token;
  });

  it("should fail login with invalid password (generic response)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: testEmail,
        password: "WrongPassword123",
      });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid email or password.");
  });

  it("should fail login with entirely wrong email (generic response)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "nonexistent@example.com",
        password: "WrongPassword123",
      });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid email or password.");
  });

  it("should fail /api/auth/me without token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Authentication required.");
  });

  it("should succeed /api/auth/me with valid token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${testUserToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(testEmail.toLowerCase());
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it("should fail /api/auth/me if account is suspended", async () => {
    const user = await User.findOne({ email: testEmail });
    user.status = "suspended";
    await user.save();

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${testUserToken}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toContain("disabled or suspended");
  });

  it("should logout successfully (tell client to drop token)", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(200);
    expect(res.body.message).toContain("Logged out successfully");
  });

  // ========== ORGANIZATION TENANT ISOLATION FIX VERIFICATION ==========

  it("should always assign the trusted Demo General Hospital to registered users", async () => {
    const testEmail4 = `org.trusted.${Date.now()}@example.com`;
    const trustedOrg = await Organization.findOne({ name: "Demo General Hospital" });

    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: testEmail4,
        password: "SecurePassword123!",
        role: "patient",
        givenName: "Trusted",
        familyName: "User",
        dateOfBirth: "1990-01-01"
      });

    expect(res.status).toBe(201);
    expect(res.body.user.organizationId).toBe(trustedOrg._id.toString());

    const user = await User.findOne({ email: testEmail4 });
    if (user) await User.deleteOne({ _id: user._id });
  });

  it("should safely ignore an existing valid organizationId and use the trusted one", async () => {
    const testEmail3 = `org.inject.existing.${Date.now()}@example.com`;
    const org = await Organization.create({ name: "Unauthorized Fake Org", status: "active" });

    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: testEmail3,
        password: "SecurePassword123!",
        role: "patient",
        givenName: "Hacker",
        familyName: "Man",
        dateOfBirth: "1990-01-01",
        organizationId: org._id.toString()
      });

    if (res.status === 201) {
      // It MUST NOT be under the fake org
      expect(res.body.user.organizationId).not.toBe(org._id.toString());

      // Cleanup
      const user = await User.findOne({ email: testEmail3 });
      if (user) await User.deleteOne({ _id: user._id });
    }
    await Organization.deleteOne({ _id: org._id });
  });

  it("should completely reject arbitrary organizationId during registration", async () => {
    const randomOrgId = new mongoose.Types.ObjectId().toString();
    const testEmail2 = `org.inject.${Date.now()}@example.com`;

    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: testEmail2,
        password: "SecurePassword123!",
        role: "patient",
        givenName: "Hacker",
        familyName: "Man",
        dateOfBirth: "1990-01-01",
        organizationId: randomOrgId // attempting to inject random valid ObjectId
      });

    if (res.status === 201) {
      // If somehow created, it MUST NOT be under the injected randomOrgId
      expect(res.body.user.organizationId).not.toBe(randomOrgId);

      // Cleanup if it passed
      const user = await User.findOne({ email: testEmail2 });
      if (user) await User.deleteOne({ _id: user._id });
    }
  });

  // ========== PHASE 3A SECURITY COVERAGE ADDITIONS ==========

  it("should reject /api/auth/me with an invalid JWT signature", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI.invalid.signature`);

    expect(res.status).toBe(401);
    expect(res.body.message).toContain("Invalid or expired token");
  });

  it("should reject /api/auth/me with an expired JWT", async () => {
    const jwt = await import("jsonwebtoken");
    const expiredToken = jwt.default.sign({ userId: orgId }, process.env.JWT_SECRET, { expiresIn: "-10s" });

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toContain("Invalid or expired token");
  });

  it("should reject /api/auth/me with malformed Authorization header", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Basic ${testUserToken}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toContain("Authentication required");
  });

  it("should reject /api/auth/me with JWT signed with wrong secret", async () => {
    const jwt = await import("jsonwebtoken");
    const wrongToken = jwt.default.sign({ userId: orgId }, "wrong_secret_key");
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${wrongToken}`);
    expect(res.status).toBe(401);
  });

  it("should reject /api/auth/me if JWT references non-existent user", async () => {
    const jwt = await import("jsonwebtoken");
    const fakeObjectId = new mongoose.Types.ObjectId().toString();
    const noUserToken = jwt.default.sign({ userId: fakeObjectId }, process.env.JWT_SECRET);

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${noUserToken}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toContain("User account not found");
  });

  it("should completely reject arbitrary organizationId during registration", async () => {
    const randomOrgId = new mongoose.Types.ObjectId().toString();
    const testEmail2 = `org.inject.${Date.now()}@example.com`;

    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: testEmail2,
        password: "SecurePassword123!",
        role: "patient",
        givenName: "Hacker",
        familyName: "Man",
        dateOfBirth: "1990-01-01",
        organizationId: randomOrgId // attempting to inject random valid ObjectId
      });

    if (res.status === 201) {
      // If somehow created, it MUST NOT be under the injected randomOrgId
      expect(res.body.user.organizationId).not.toBe(randomOrgId);

      // Cleanup if it passed
      const user = await User.findOne({ email: testEmail2 });
      if (user) await User.deleteOne({ _id: user._id });
    }
  });

  it("should safely ignore an existing valid organizationId and use the trusted one", async () => {
    const testEmail3 = `org.inject.existing.${Date.now()}@example.com`;
    const org = await Organization.create({ name: "Unauthorized Fake Org", status: "active" });

    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: testEmail3,
        password: "SecurePassword123!",
        role: "patient",
        givenName: "Hacker",
        familyName: "Man",
        dateOfBirth: "1990-01-01",
        organizationId: org._id.toString()
      });

    if (res.status === 201) {
      // It MUST NOT be under the fake org
      expect(res.body.user.organizationId).not.toBe(org._id.toString());

      // Cleanup
      const user = await User.findOne({ email: testEmail3 });
      if (user) await User.deleteOne({ _id: user._id });
    }
    await Organization.deleteOne({ _id: org._id });
  });

  it("should rate limit rapid consecutive login attempts", async () => {
    // We expect express-rate-limit configured to 10 requests / 15 min.
    // We have already performed some logins in prior tests.
    // Let's loop 11 times. Eventually it should hit 429.
    let status429Hit = false;
    for (let i = 0; i < 12; i++) {
      const res = await request(app).post("/api/auth/login").send({
        email: "some@example.com",
        password: "wrong"
      });
      if (res.status === 429) {
        status429Hit = true;
        break;
      }
    }
    expect(status429Hit).toBe(true);
  });

  it("should rate limit registration attempts as well", async () => {
    // Because we just exhausted the rate limit bucket (it is shared by authLimiter),
    // next request to register should ALSO be 429.
    const res = await request(app).post("/api/auth/register").send({
      email: "rate.limit@example.com",
      password: "password123",
      role: "patient"
    });
    expect(res.status).toBe(429);
  });

  it("should still report MongoDB connected in GET /api/health", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.mongo).toBe("connected");
  });

});
