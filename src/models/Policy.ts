import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDocumentItem {
  url: string;
  type: "PDF" | "Image" | "Other";
  label: string;
  publicId?: string;
}

export interface IPolicy extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  policyNumber: string;
  policyType: "Car" | "Health" | "Life" | "Home" | "Travel" | "Other";
  issueDate: Date;
  expiryDate: Date;
  mobileNumber: string;
  email: string;
  documents: IDocumentItem[];
  isMuted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentItemSchema = new Schema(
  {
    url: { type: String, required: true },
    type: { type: String, enum: ["PDF", "Image", "Other"], required: true },
    label: { type: String, required: true },
    publicId: { type: String, required: false },
  },
  { _id: false },
);

const PolicySchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "Admin", required: true, index: true },
    name: { type: String, required: true },
    policyNumber: { type: String, required: true, unique: true, index: true },
    policyType: {
      type: String,
      enum: ["Car", "Health", "Life", "Home", "Travel", "Other"],
      required: true,
    },
    issueDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    mobileNumber: { type: String, default: "" },
    email: { type: String, default: "" },
    documents: { type: [DocumentItemSchema], default: [] },
    isMuted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const Policy: Model<IPolicy> =
  mongoose.models.Policy || mongoose.model<IPolicy>("Policy", PolicySchema);

export default Policy;
