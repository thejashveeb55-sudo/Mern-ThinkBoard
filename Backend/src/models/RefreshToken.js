import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    token: { type: String, required: true, unique: true }, // random secure string, not a JWT
    deviceId: { type: String, required: true }, // isolates sessions per device
    status: {
      type: String,
      enum: ["active", "used", "revoked"],
      default: "active",
    },
    expiresAt: { type: Date, required: true }, // absolute timestamp, compared against Date.now()
  },
  { timestamps: true } // createdAt doubles as "issued at"
);

const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);
export default RefreshToken;