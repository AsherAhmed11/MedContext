import mongoose from "mongoose";

const safetySummarySchema = new mongoose.Schema(
  {
    criticalAllergyLabels: {
      type: [String],
      default: [],
    },
    activeMedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    criticalConditionLabels: {
      type: [String],
      default: [],
    },
    updatedAt: {
      type: Date,
    },
  },
  { _id: false }
);

const patientSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: undefined,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    givenName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    familyName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    sexAtBirth: {
      type: String,
      enum: ["female", "male", "intersex", "unknown", "unspecified"],
    },
    mrn: {
      type: String,
      trim: true,
      maxlength: 64,
    },
    safetySummary: {
      type: safetySummarySchema,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      required: true,
      default: "active",
    },
  },
  {
    timestamps: true,
    collection: "patients",
  }
);

patientSchema.index({ userId: 1 }, { unique: true, sparse: true });
patientSchema.index(
  { organizationId: 1, mrn: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { mrn: { $type: "string" } },
  }
);
patientSchema.index({ organizationId: 1, status: 1 });
patientSchema.index({ organizationId: 1, familyName: 1, givenName: 1 });

patientSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

const Patient =
  mongoose.models.Patient || mongoose.model("Patient", patientSchema);

export default Patient;
