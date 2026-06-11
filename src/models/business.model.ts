import mongoose, { Mongoose } from "mongoose";

const businessSchema = new mongoose.Schema(
  {
    businessName: String,
    phoneNumber: String,
    email: String,
    active: {
      type: Boolean,
      default: true,
    },
    category: {
      type: String,
      default: "plumber",
      enum: [
        "hvac",
        "plumber",
        "electrician",
        "handyman",
        "landscaper",
        "mover",
        "painter",
        "cleaner",
        "contractor",
        "roofer",
      ],
    },
    Leads: [
      {
        type: mongoose.Types.ObjectId,
        ref: "Lead",
      },
    ],
  },
  { timestamps: true },
);
 
export default mongoose.model("Business", businessSchema);