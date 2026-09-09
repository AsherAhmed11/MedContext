import mongoose from "mongoose";

const medicalHistorySchema = new mongoose.Schema(
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
    condition: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["active", "resolved"],
      required: true,
      default: "active",
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
    },
  },
  {
    timestamps: true,
    collection: "medical_histories",
  }
);

medicalHistorySchema.index({ patientId: 1, status: 1 });
medicalHistorySchema.index({ patientId: 1, startDate: -1 });
medicalHistorySchema.index({ organizationId: 1, patientId: 1 });

medicalHistorySchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

const MedicalHistory =
  mongoose.models.MedicalHistory ||
  mongoose.model("MedicalHistory", medicalHistorySchema);

export default MedicalHistory;
