import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    licenseNumber: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    specialties: {
      type: [String],
      default: [],
      validate: {
        validator(value) {
          return value.every(
            (item) => typeof item === "string" && item.trim().length > 0
          );
        },
        message: "Specialties must be non-empty strings.",
      },
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
    collection: "doctors",
  }
);

doctorSchema.index({ userId: 1 }, { unique: true });
doctorSchema.index({ organizationId: 1, status: 1 });
doctorSchema.index({ organizationId: 1, specialties: 1 });

doctorSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

const Doctor = mongoose.models.Doctor || mongoose.model("Doctor", doctorSchema);

export default Doctor;
