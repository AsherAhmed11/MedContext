import express from "express";
import mongoose from "mongoose";
import Patient from "../models/Patient.js";
import Appointment from "../models/Appointment.js";
import ContextEngineResult from "../models/ContextEngineResult.js";
import { requireRole } from "../middleware/authorize.js";
import { generateContextSummary, validateAIResponse } from "../services/aiAssistance.js";

const router = express.Router();

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * POST /api/ai-assistance/summarize
 * Generate AI summary of ranked patient context
 * Doctor only - requires contextResultId from Context Engine
 */
router.post("/summarize", requireRole("doctor"), async (req, res) => {
  try {
    const { contextResultId, appointmentId, options = {} } = req.body;

    if (!contextResultId || !isValidObjectId(contextResultId)) {
      return res.status(400).json({
        message: "Valid contextResultId is required."
      });
    }

    // Get the context result (must be from Context Engine first)
    const contextResult = await ContextEngineResult.findOne({
      _id: contextResultId,
      organizationId: req.user.organizationId,
    }).lean();

    if (!contextResult) {
      return res.status(404).json({
        message: "Context result not found. Generate context ranking first."
      });
    }

    // Verify appointment exists and belongs to this doctor's org
    const appointment = await Appointment.findOne({
      _id: contextResult.appointmentId,
      organizationId: req.user.organizationId,
    }).lean();

    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found."
      });
    }

    // Verify patient exists
    const patient = await Patient.findOne({
      _id: contextResult.patientId,
      organizationId: req.user.organizationId,
    }).lean();

    if (!patient) {
      return res.status(404).json({
        message: "Patient not found."
      });
    }

    // Generate AI summary (this is AFTER authorization and ranking)
    const summaryResult = await generateContextSummary(
      contextResult.rankedData,
      contextResult.specialty,
      {
        maxLength: options.maxLength || 200,
        focusArea: options.focusArea || 'general',
      }
    );

    // Validate AI response for safety
    let finalSummary = summaryResult;
    if (summaryResult.summary) {
      const validation = validateAIResponse(summaryResult);
      if (!validation.isValid) {
        finalSummary = {
          ...summaryResult,
          summary: validation.sanitizedResponse,
          warning: 'Original AI response was filtered for safety',
          violations: validation.violations,
        };
      }
    }

    // Audit: AI summary generated
    await req.audit({
      action: "ai_summary_generated",
      resourceType: "ai_assistance",
      resourceId: contextResult._id,
      patientId: contextResult.patientId,
      outcome: finalSummary.summary ? "success" : "failure",
      metadata: {
        appointmentId: contextResult.appointmentId,
        specialty: contextResult.specialty,
        itemCount: (contextResult.rankedData.critical?.length || 0) +
                  (contextResult.rankedData.high?.length || 0) +
                  (contextResult.rankedData.medium?.length || 0) +
                  (contextResult.rankedData.low?.length || 0),
        aiProvider: finalSummary.provider || 'unknown',
        hadViolations: finalSummary.violations?.length > 0,
      },
    });

    res.json({
      contextResultId,
      appointmentId: contextResult.appointmentId,
      patientId: contextResult.patientId,
      specialty: contextResult.specialty,
      summary: finalSummary,
      dataSource: {
        itemCounts: {
          critical: contextResult.rankedData.critical?.length || 0,
          high: contextResult.rankedData.high?.length || 0,
          medium: contextResult.rankedData.medium?.length || 0,
          low: contextResult.rankedData.low?.length || 0,
        },
        rankingDate: contextResult.generatedAt,
      },
    });

  } catch (error) {
    console.error("AI summarization error:", error);
    res.status(500).json({
      message: "AI summarization failed. Please review ranked data manually.",
      fallback: "Manual review recommended - AI service unavailable."
    });
  }
});

/**
 * GET /api/ai-assistance/config
 * Get AI service configuration and status
 * Doctor only - for UI to know if AI is available
 */
router.get("/config", requireRole("doctor"), async (req, res) => {
  try {
    const isEnabled = process.env.AI_ENABLED === 'true';
    const provider = process.env.AI_PROVIDER || 'not-configured';

    res.json({
      aiEnabled: isEnabled,
      provider: isEnabled ? provider : null,
      features: {
        contextSummary: isEnabled,
        maxSummaryLength: 500,
        supportedLanguages: ['en'],
      },
      disclaimer: isEnabled
        ? "AI summaries are for reference only. Always review original medical records for clinical decisions."
        : "AI assistance is not enabled. Manual review of ranked data is available.",
    });

  } catch (error) {
    console.error("AI config error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

/**
 * POST /api/ai-assistance/feedback
 * Collect feedback on AI summary quality
 * Doctor only - for improving AI prompts
 */
router.post("/feedback", requireRole("doctor"), async (req, res) => {
  try {
    const { contextResultId, summaryId, rating, feedback, helpful } = req.body;

    if (!contextResultId || !isValidObjectId(contextResultId)) {
      return res.status(400).json({
        message: "Valid contextResultId is required."
      });
    }

    // Verify the context result exists
    const contextResult = await ContextEngineResult.findOne({
      _id: contextResultId,
      organizationId: req.user.organizationId,
    }).lean();

    if (!contextResult) {
      return res.status(404).json({
        message: "Context result not found."
      });
    }

    // Audit: AI feedback collected (no PHI in feedback)
    await req.audit({
      action: "ai_feedback_submitted",
      resourceType: "ai_assistance",
      resourceId: contextResult._id,
      patientId: contextResult.patientId,
      outcome: "success",
      metadata: {
        rating: rating ? parseInt(rating) : null,
        helpful: helpful === true ? 'yes' : helpful === false ? 'no' : 'unknown',
        hasFeedbackText: !!feedback,
        specialty: contextResult.specialty,
      },
    });

    res.json({
      message: "Feedback recorded successfully.",
      contextResultId,
      thankYou: "Your feedback helps improve AI summaries for future use.",
    });

  } catch (error) {
    console.error("AI feedback error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

export default router;