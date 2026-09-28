import mongoose from "mongoose";

const contextEngineSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    specialty: {
      type: String,
      required: true,
      trim: true,
    },
    rankedData: {
      critical: [
        {
          type: {
            type: String,
            enum: ["allergy", "medication", "condition", "history"],
          },
          resourceId: mongoose.Schema.Types.ObjectId,
          data: mongoose.Schema.Types.Mixed,
          reason: String,
          score: Number,
        },
      ],
      high: [
        {
          type: {
            type: String,
            enum: ["report", "appointment", "medication", "history"],
          },
          resourceId: mongoose.Schema.Types.ObjectId,
          data: mongoose.Schema.Types.Mixed,
          reason: String,
          score: Number,
        },
      ],
      medium: [
        {
          type: {
            type: String,
            enum: ["report", "appointment", "history"],
          },
          resourceId: mongoose.Schema.Types.ObjectId,
          data: mongoose.Schema.Types.Mixed,
          reason: String,
          score: Number,
        },
      ],
      low: [
        {
          type: {
            type: String,
            enum: ["report", "appointment", "history"],
          },
          resourceId: mongoose.Schema.Types.ObjectId,
          data: mongoose.Schema.Types.Mixed,
          reason: String,
          score: Number,
        },
      ],
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "context_engine_results",
  }
);

contextEngineSchema.index({ appointmentId: 1 });
contextEngineSchema.index({ patientId: 1, organizationId: 1 });

const ContextEngineResult =
  mongoose.models.ContextEngineResult ||
  mongoose.model("ContextEngineResult", contextEngineSchema);

export default ContextEngineResult;
