import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    phoneNumber: String,
    callTranscription: [
      {
        role: {
          type: String,
          enum: ["user", "agent"],
        },
        message: String,
      },
    ],
    outcome: String,
    status: {
      type: String,
      enum: ["in-progress", "dispatch_ready", "answered", "completed", "missed", "failed"],
      default: "in-progress",
    },
  },
  { timestamps: true },
);

export default mongoose.model("Lead", leadSchema);
