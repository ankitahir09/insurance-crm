import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAdmin extends Document {
  name: string;
  email: string;
  mobile: string;
  passwordHash: string;
  agentEmailSettings?: {
    smtpEmail: string;
    smtpAppPassword: string;
    isConfigured: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const AdminSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    mobile: { type: String, required: true },
    passwordHash: { type: String, required: true },
    agentEmailSettings: {
      smtpEmail: { type: String, default: "" },
      smtpAppPassword: { type: String, default: "" },
      isConfigured: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

const Admin: Model<IAdmin> =
  mongoose.models.Admin || mongoose.model<IAdmin>("Admin", AdminSchema);

export default Admin;
