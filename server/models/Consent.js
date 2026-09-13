import mongoose from "mongoose";

const consentSchema = new mongoose.Schema(
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
    grantedToUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    purpose: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["active", "revoked", "expired"],
      required: true,
      default: "active",
    },
    grantedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
    },
    revokedAt: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
    collection: "consents",
  }
);

consentSchema.index({ patientId: 1, status: 1 });
consentSchema.index({ organizationId: 1, patientId: 1 });
consentSchema.index({ grantedToUserId: 1, status: 1 });
consentSchema.index({ patientId: 1, grantedToUserId: 1, status: 1 });

consentSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

const Consent =
  mongoose.models.Consent || mongoose.model("Consent", consentSchema);

export default Consent;
