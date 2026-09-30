import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    isAdmin: { type: Boolean, default: false }, // bypasses team-membership checks entirely
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;