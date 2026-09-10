import express from "express";
import mongoose from "mongoose";
import Doctor from "../models/Doctor.js";
import { requireRole } from "../middleware/authorize.js";

const router = express.Router();

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * GET /api/doctors
 * Accessible to admins only.
 * Lists all doctors within the admin's organization.
 */
router.get("/", requireRole("admin"), async (req, res) => {
  try {
    const filter = { organizationId: req.user.organizationId };

    const doctors = await Doctor.find(filter)
      .select("-__v")
      .sort({ displayName: 1 })
      .lean();

    res.json({ doctors });
  } catch (error) {
    console.error("List doctors error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

/**
 * GET /api/doctors/:doctorId
 * Accessible to authenticated users in the same organization.
 * Cross-organization lookup returns 404.
 */
router.get("/:doctorId", async (req, res) => {
  try {
    const { doctorId } = req.params;

    if (!isValidObjectId(doctorId)) {
      return res.status(404).json({ message: "Doctor not found." });
    }

    const doctor = await Doctor.findOne({
      _id: doctorId,
      organizationId: req.user.organizationId,
    }).lean();

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found." });
    }

    res.json({ doctor });
  } catch (error) {
    console.error("Get doctor error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

/**
 * PUT /api/doctors/:doctorId
 * Accessible to admins only.
 * Admins can update any doctor in their organization.
 */
router.put("/:doctorId", requireRole("admin"), async (req, res) => {
  try {
    const { doctorId } = req.params;

    if (!isValidObjectId(doctorId)) {
      return res.status(404).json({ message: "Doctor not found." });
    }

    const doctor = await Doctor.findOne({
      _id: doctorId,
      organizationId: req.user.organizationId,
    });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found." });
    }

    const allowedFields = ["displayName", "licenseNumber", "specialties", "status"];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        doctor[field] = req.body[field];
      }
    }

    await doctor.save();

    res.json({ doctor: doctor.toJSON() });
  } catch (error) {
    console.error("Update doctor error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

export default router;
