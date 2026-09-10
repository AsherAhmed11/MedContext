import express from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";
import Appointment from "../models/Appointment.js";
import { requireRole } from "../middleware/authorize.js";

const router = express.Router();

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// All routes in this router require admin role
router.use(requireRole("admin"));

/**
 * GET /api/admin/users
 * Returns list of all users within the admin's organization.
 */
router.get("/users", async (req, res) => {
  try {
    const users = await User.find({ organizationId: req.user.organizationId })
      .select("-passwordHash -__v")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ users });
  } catch (error) {
    console.error("Admin list users error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

/**
 * PUT /api/admin/users/:userId/status
 * Updates status of a user in the same organization.
 * Constraints:
 *  - Admin cannot suspend self.
 *  - Admin cannot modify/suspend another admin.
 *  - No role changes allowed.
 */
router.put("/users/:userId/status", async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(userId)) {
      return res.status(404).json({ message: "User not found." });
    }

    if (!status || !["active", "inactive", "suspended"].includes(status)) {
      return res
        .status(400)
        .json({ message: "Status must be 'active', 'inactive', or 'suspended'." });
    }

    const targetUser = await User.findOne({
      _id: userId,
      organizationId: req.user.organizationId,
    });

    if (!targetUser) {
      return res.status(404).json({ message: "User not found." });
    }

    // Admin cannot modify/suspend own status
    if (req.user._id.toString() === targetUser._id.toString()) {
      return res
        .status(400)
        .json({ message: "Admin cannot modify own account status." });
    }

    // Admin cannot modify/suspend another admin
    if (targetUser.role === "admin") {
      return res
        .status(403)
        .json({ message: "Cannot modify status of another admin." });
    }

    targetUser.status = status;
    await targetUser.save();

    res.json({ user: targetUser.toJSON() });
  } catch (error) {
    console.error("Admin update user status error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

/**
 * GET /api/admin/stats
 * Aggregates organization-scoped counts.
 */
router.get("/stats", async (req, res) => {
  try {
    const orgId = req.user.organizationId;

    const [
      totalUsers,
      activeUsers,
      totalPatients,
      totalDoctors,
      totalAppointments,
    ] = await Promise.all([
      User.countDocuments({ organizationId: orgId }),
      User.countDocuments({ organizationId: orgId, status: "active" }),
      Patient.countDocuments({ organizationId: orgId }),
      Doctor.countDocuments({ organizationId: orgId }),
      Appointment.countDocuments({ organizationId: orgId }),
    ]);

    res.json({
      stats: {
        totalUsers,
        activeUsers,
        totalPatients,
        totalDoctors,
        totalAppointments,
      },
    });
  } catch (error) {
    console.error("Admin get stats error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

export default router;
