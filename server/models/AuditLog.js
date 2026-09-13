import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
    },
    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    resourceType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    outcome: {
      type: String,
      enum: ["success", "failure", "denied"],
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "audit_logs",
  }
);

auditLogSchema.index({ organizationId: 1, timestamp: -1 });
auditLogSchema.index({ actorUserId: 1, timestamp: -1 });
auditLogSchema.index({ patientId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ resourceType: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });

auditLogSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

const AuditLog =
  mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;
