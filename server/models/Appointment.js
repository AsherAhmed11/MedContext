import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
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
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    appointmentDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      required: true,
      default: "scheduled",
    },
    type: {
      type: String,
      enum: ["consultation", "follow_up", "procedure", "other"],
      required: true,
      default: "consultation",
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
    collection: "appointments",
  }
);

appointmentSchema.index({ doctorId: 1, appointmentDate: 1 });
appointmentSchema.index({ patientId: 1, appointmentDate: 1 });
appointmentSchema.index({ organizationId: 1, appointmentDate: 1 });
appointmentSchema.index({ organizationId: 1, patientId: 1 });

appointmentSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

const Appointment =
  mongoose.models.Appointment ||
  mongoose.model("Appointment", appointmentSchema);

export default Appointment;
