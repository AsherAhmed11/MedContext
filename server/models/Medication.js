import mongoose from "mongoose";

const medicationSchema = new mongoose.Schema(
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
    medicationName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    dosage: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    frequency: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    status: {
      type: String,
      enum: ["active", "stopped", "completed"],
      required: true,
      default: "active",
    },
    prescribingDoctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "medications",
  }
);

medicationSchema.index({ patientId: 1, status: 1 });
medicationSchema.index({ organizationId: 1, patientId: 1 });
medicationSchema.index({ patientId: 1, medicationName: 1 });

medicationSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

const Medication =
  mongoose.models.Medication || mongoose.model("Medication", medicationSchema);

export default Medication;
