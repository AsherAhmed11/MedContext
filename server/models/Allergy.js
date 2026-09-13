import mongoose from "mongoose";

const allergySchema = new mongoose.Schema(
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
    allergen: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    reaction: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    severity: {
      type: String,
      enum: ["mild", "moderate", "severe", "life_threatening"],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "historical"],
      required: true,
      default: "active",
    },
    safetyCritical: {
      type: Boolean,
      required: true,
      default: false,
    },
    alwaysVisible: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "allergies",
  }
);

allergySchema.index({ patientId: 1, status: 1 });
allergySchema.index({ patientId: 1, safetyCritical: 1, alwaysVisible: 1 });
allergySchema.index({ organizationId: 1, patientId: 1 });

allergySchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

const Allergy =
  mongoose.models.Allergy || mongoose.model("Allergy", allergySchema);

export default Allergy;
