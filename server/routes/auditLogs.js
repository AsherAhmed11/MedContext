import express from "express";
import mongoose from "mongoose";
import AuditLog from "../models/AuditLog.js";
import { requireRole } from "../middleware/authorize.js";

const router = express.Router();

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ── List audit logs ─────────────────────────────────────────────────────────

/**
 * GET /api/audit-logs
 * Admin only. Supports filtering by action, resourceType, actorUserId, patientId.
 * Supports pagination via limit/offset.
 */
router.get("/", requireRole("admin"), async (req, res) => {
  try {
    const filter = { organizationId: req.user.organizationId };

    // Optional filters
    if (req.query.action) {
      filter.action = String(req.query.action).trim();
    }
    if (req.query.resourceType) {
      filter.resourceType = String(req.query.resourceType).trim();
    }
    if (req.query.actorUserId && isValidObjectId(req.query.actorUserId)) {
      filter.actorUserId = req.query.actorUserId;
    }
    if (req.query.patientId && isValidObjectId(req.query.patientId)) {
      filter.patientId = req.query.patientId;
    }
    if (req.query.outcome && ["success", "failure", "denied"].includes(req.query.outcome)) {
      filter.outcome = req.query.outcome;
    }

    // Date range filtering
    if (req.query.from || req.query.to) {
      filter.timestamp = {};
      if (req.query.from) {
        filter.timestamp.$gte = new Date(req.query.from);
      }
      if (req.query.to) {
        filter.timestamp.$lte = new Date(req.query.to);
      }
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      auditLogs: logs,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("List audit logs error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// ── Get audit log by ID ─────────────────────────────────────────────────────

/**
 * GET /api/audit-logs/:logId
 * Admin only.
 */
router.get("/:logId", requireRole("admin"), async (req, res) => {
  try {
    const { logId } = req.params;

    if (!isValidObjectId(logId)) {
      return res.status(404).json({ message: "Audit log not found." });
    }

    const log = await AuditLog.findOne({
      _id: logId,
      organizationId: req.user.organizationId,
    }).lean();

    if (!log) {
      return res.status(404).json({ message: "Audit log not found." });
    }

    res.json({ auditLog: log });
  } catch (error) {
    console.error("Get audit log error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// ── Get audit log stats ─────────────────────────────────────────────────────

/**
 * GET /api/audit-logs/stats/summary
 * Admin only. Returns counts by action type.
 */
router.get("/stats/summary", requireRole("admin"), async (req, res) => {
  try {
    const orgFilter = { organizationId: req.user.organizationId };

    const [totalLogs, byAction, byOutcome] = await Promise.all([
      AuditLog.countDocuments(orgFilter),
      AuditLog.aggregate([
        { $match: orgFilter },
        { $group: { _id: "$action", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AuditLog.aggregate([
        { $match: orgFilter },
        { $group: { _id: "$outcome", count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      stats: {
        total: totalLogs,
        byAction: byAction.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byOutcome: byOutcome.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    console.error("Audit log stats error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

export default router;
