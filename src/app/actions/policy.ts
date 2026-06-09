"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Policy from "@/models/Policy";
import AuditLog from "@/models/AuditLog";
import { addOneYearSafe } from "@/lib/services/renew";
import {
  sendEmailReminder,
  sendWhatsAppReminder,
} from "@/lib/services/communication";
import { revalidatePath } from "next/cache";
import cloudinary from "@/lib/cloudinary";

// push expiry date out by +1 year
export async function renewPolicyAction(policyId: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    throw new Error("Authentication required for this operation");
  }

  await dbConnect();

  const policy = await Policy.findOne({
    _id: policyId,
    userId: session.user.id,
  });
  if (!policy) {
    throw new Error("Policy not found or access denied");
  }

  const oldExpiry = policy.expiryDate;
  const newExpiry = addOneYearSafe(oldExpiry);

  policy.expiryDate = newExpiry;
  await policy.save();

  // Create Audit Log
  await AuditLog.create({
    userId: session.user.id,
    policyId: policy._id,
    action: "ONE_TAP_RENEW",
    channel: "System",
    recipient: policy.email || policy.mobileNumber || "N/A",
    status: "Success",
    details: `Policy manually renewed. Expiry date updated from ${oldExpiry.toLocaleDateString("en-US")} to ${newExpiry.toLocaleDateString("en-US")}.`,
  });

  revalidatePath("/");
  return {
    success: true,
    expiryDate: newExpiry.toISOString(),
  };
}

// toggle DND for notifications
export async function toggleMuteAction(policyId: string, isMuted: boolean) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    throw new Error("Authentication required for this operation");
  }

  await dbConnect();

  const policy = await Policy.findOneAndUpdate(
    { _id: policyId, userId: session.user.id },
    { isMuted },
    { new: true },
  );

  if (!policy) {
    throw new Error("Policy not found or access denied");
  }

  // Create Audit Log
  await AuditLog.create({
    userId: session.user.id,
    policyId: policy._id,
    action: isMuted ? "MUTED_ALERTS" : "UNMUTED_ALERTS",
    channel: "System",
    recipient: policy.email || policy.mobileNumber || "N/A",
    status: "Success",
    details: isMuted
      ? "Alert notifications muted (Do Not Disturb enabled)"
      : "Alert notifications unmuted (Do Not Disturb disabled)",
  });

  revalidatePath("/");
  return {
    success: true,
    isMuted: policy.isMuted,
  };
}

// manual email reminder dispatch
export async function sendManualEmailAction(policyId: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    throw new Error("Authentication required for this operation");
  }

  await dbConnect();

  const policy = await Policy.findOne({
    _id: policyId,
    userId: session.user.id,
  });
  if (!policy) {
    throw new Error("Policy not found or access denied");
  }

  // Calculate days remaining to determine if a specific milestone template is appropriate
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(policy.expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry.getTime() - today.getTime();
  const daysLeft = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const result = await sendEmailReminder(policy, daysLeft, true);

  revalidatePath("/");
  return result;
}

// manual whatsapp reminder stub
export async function sendManualWhatsAppAction(policyId: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    throw new Error("Authentication required for this operation");
  }

  await dbConnect();

  const policy = await Policy.findOne({
    _id: policyId,
    userId: session.user.id,
  });
  if (!policy) {
    throw new Error("Policy not found or access denied");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(policy.expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry.getTime() - today.getTime();
  const daysLeft = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const result = await sendWhatsAppReminder(policy, daysLeft, true);

  revalidatePath("/");
  return result;
}

// remove document from vault (cloudinary & DB)
export async function deleteDocumentAction(
  policyId: string,
  publicId: string,
  url: string,
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    throw new Error("Authentication required for this operation");
  }

  await dbConnect();

  const policy = await Policy.findOne({
    _id: policyId,
    userId: session.user.id,
  });
  if (!policy) {
    throw new Error("Policy record not found or access denied");
  }

  // 1. Delete from Cloudinary
  if (publicId) {
    const hasCloudinary =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET;
    if (!hasCloudinary) {
      throw new Error(
        "Cloudinary environment variables are not configured in .env.local.",
      );
    }

    try {
      const isPdf = url.toLowerCase().includes(".pdf");
      const resource_type = isPdf ? "raw" : "image";

      const destroyResult = await cloudinary.uploader.destroy(publicId, {
        resource_type,
      });
      console.log(
        `[CLOUDINARY] Destroy result for ${publicId}:`,
        destroyResult,
      );
    } catch (err) {
      console.error(
        `[CLOUDINARY ERROR] Failed to delete asset ${publicId}:`,
        err,
      );
    }
  }

  // 2. Delete from MongoDB documents array
  policy.documents = policy.documents.filter((doc: any) => {
    if (doc.publicId && publicId) {
      return doc.publicId !== publicId;
    }
    return doc.url !== url;
  });

  await policy.save();

  // 3. Log action to Audit Trail
  await AuditLog.create({
    userId: session.user.id,
    policyId: policy._id,
    action: "SYSTEM_INIT",
    channel: "System",
    recipient: policy.email || policy.mobileNumber || "N/A",
    status: "Success",
    details: `Document deleted from vault. Public ID: ${publicId || "N/A"}`,
  });

  revalidatePath("/");
  return { success: true };
}

// delete policy and all associated vault documents
export async function deletePolicyAction(policyId: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    throw new Error("Authentication required for this operation");
  }

  await dbConnect();

  // Find policy and verify ownership
  const policy = await Policy.findOne({
    _id: policyId,
    userId: session.user.id,
  });
  if (!policy) {
    throw new Error("Policy record not found or access denied");
  }

  // 1. Delete all attached documents from Cloudinary
  const hasCloudinary =
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET;

  if (policy.documents && policy.documents.length > 0) {
    for (const doc of policy.documents) {
      if (doc.publicId) {
        if (!hasCloudinary) {
          console.warn(
            "[CLOUDINARY WARNING] Cloudinary variables missing during bulk policy document deletion.",
          );
          continue;
        }
        try {
          const isPdf = doc.url.toLowerCase().includes(".pdf");
          const resource_type = isPdf ? "raw" : "image";
          const destroyResult = await cloudinary.uploader.destroy(
            doc.publicId,
            { resource_type },
          );
          console.log(
            `[CLOUDINARY] Destroyed doc ${doc.publicId}:`,
            destroyResult,
          );
        } catch (err) {
          console.error(
            `[CLOUDINARY ERROR] Failed to delete doc ${doc.publicId}:`,
            err,
          );
        }
      }
    }
  }

  // 2. Delete the policy record from MongoDB
  await Policy.deleteOne({ _id: policyId, userId: session.user.id });

  // 3. Log action to Audit Trail
  await AuditLog.create({
    userId: session.user.id,
    policyId: policy._id,
    action: "SYSTEM_INIT",
    channel: "System",
    recipient: policy.email || policy.mobileNumber || "N/A",
    status: "Success",
    details: `Policy "${policy.policyNumber}" completely deleted along with ${policy.documents.length} attached documents.`,
  });

  revalidatePath("/");
  return { success: true };
}
