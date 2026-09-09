import mongoose from "mongoose";

const emergencyAccessSchema = new mongoose.Schema(
  {
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
    accessedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    endedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["active", "expired", "ended"],
      required: true,
      default: "active",
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
    collection: "emergency_accesses",
  }
);

emergencyAccessSchema.index({ patientId: 1, status: 1 });
emergencyAccessSchema.index({ organizationId: 1, patientId: 1 });
emergencyAccessSchema.index({ accessedByUserId: 1, status: 1 });
emergencyAccessSchema.index({
  accessedByUserId: 1,
  patientId: 1,
  status: 1,
  expiresAt: 1,
});
emergencyAccessSchema.index({ expiresAt: 1 });

emergencyAccessSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

const EmergencyAccess =
  mongoose.models.EmergencyAccess ||
  mongoose.model("EmergencyAccess", emergencyAccessSchema);

export default EmergencyAccess;
