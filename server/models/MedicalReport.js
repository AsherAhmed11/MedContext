import mongoose from "mongoose";

const medicalReportSchema = new mongoose.Schema(
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
    reportType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    reportDate: {
      type: Date,
      required: true,
    },
    authorDoctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
    },
    fileUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
    },
    summary: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    findings: {
      type: String,
      trim: true,
      maxlength: 5000,
    },
  },
  {
    timestamps: true,
    collection: "medical_reports",
  }
);

medicalReportSchema.index({ patientId: 1, reportDate: -1 });
medicalReportSchema.index({ patientId: 1, reportType: 1 });
medicalReportSchema.index({ organizationId: 1, patientId: 1 });

medicalReportSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

const MedicalReport =
  mongoose.models.MedicalReport ||
  mongoose.model("MedicalReport", medicalReportSchema);

export default MedicalReport;
