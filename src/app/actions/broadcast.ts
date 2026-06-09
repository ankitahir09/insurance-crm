"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Policy from "@/models/Policy";
import Admin from "@/models/Admin";
import AuditLog from "@/models/AuditLog";
import {
  replaceTokens,
  getDynamicTransporter,
} from "@/lib/services/communication";

// broadcast custom message to policies via email and/or whatsapp
export async function sendBroadcastAction(data: {
  policyIds: string[];
  message: string;
  channels: ("Email" | "WhatsApp")[];
}) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    throw new Error("Authentication required for this operation");
  }

  if (!data.policyIds || data.policyIds.length === 0) {
    throw new Error(
      "Please select at least one policyholder for the broadcast",
    );
  }

  if (!data.message || data.message.trim() === "") {
    throw new Error("Broadcast message content cannot be empty");
  }

  if (!data.channels || data.channels.length === 0) {
    throw new Error("Please select at least one communication channel");
  }

  await dbConnect();

  if (data.channels.includes("Email")) {
    const admin = await Admin.findById(session.user.id);
    if (
      !admin ||
      !admin.agentEmailSettings?.isConfigured ||
      !admin.agentEmailSettings?.smtpEmail
    ) {
      return {
        success: false,
        error: "SMTP_NOT_CONFIGURED",
        message:
          "Broadcast failed: Please set up your Gmail ID and 16-character App Password in your Profile Settings to enable messaging.",
      };
    }
  }

  // scope query to current user
  const policies = await Policy.find({
    _id: { $in: data.policyIds },
    userId: session.user.id,
  });

  let successCount = 0;
  let failCount = 0;

  for (const policy of policies) {
    // parse message tokens
    const formattedMessage = replaceTokens(data.message, policy);

    // email dispatch
    if (data.channels.includes("Email")) {
      try {
        if (!policy.email) {
          throw new Error("Missing customer email address");
        }

        console.log(`[BROADCAST EMAIL DISPATCH]
To: ${policy.email}
Content: ${formattedMessage}
----------------------------------------`);

        const { transporter, emailUser } = await getDynamicTransporter(
          session.user.id,
        );

        const info = await transporter.sendMail({
          from: `"Agency Alerts" <${emailUser}>`,
          to: policy.email,
          subject: "Important Update - Chanakya Advisory Careers",
          text: formattedMessage,
        });

        console.log(
          `[NODEMAILER BROADCAST] Email sent successfully. Message ID: ${info.messageId}`,
        );

        await AuditLog.create({
          userId: session.user.id,
          policyId: policy._id,
          action: "BROADCAST_EMAIL",
          channel: "Email",
          recipient: policy.email,
          status: "Success",
          details: `Broadcast sent via Gmail SMTP. Message ID: ${info.messageId}`,
        });

        successCount++;
      } catch (err: any) {
        failCount++;
        console.error(
          `[BROADCAST ERROR] Email failed for ${policy.policyNumber}:`,
          err,
        );

        await AuditLog.create({
          userId: session.user.id,
          policyId: policy._id,
          action: "BROADCAST_EMAIL",
          channel: "Email",
          recipient: policy.email || "N/A",
          status: "Failed",
          details: `Broadcast failed: ${err.message || String(err)}`,
        });
      }
    }

    // whatsapp dispatch stub
    if (data.channels.includes("WhatsApp")) {
      try {
        if (!policy.mobileNumber) {
          throw new Error("Missing customer mobile number");
        }

        console.log(`[BROADCAST WHATSAPP DISPATCH]
To: ${policy.mobileNumber}
Content: ${formattedMessage}
----------------------------------------`);

        await AuditLog.create({
          userId: session.user.id,
          policyId: policy._id,
          action: "BROADCAST_WHATSAPP",
          channel: "WhatsApp",
          recipient: policy.mobileNumber,
          status: "Success",
          details: `Broadcast: "${formattedMessage}"`,
        });

        successCount++;
      } catch (err: any) {
        failCount++;
        console.error(
          `[BROADCAST ERROR] WhatsApp failed for ${policy.policyNumber}:`,
          err,
        );

        await AuditLog.create({
          userId: session.user.id,
          policyId: policy._id,
          action: "BROADCAST_WHATSAPP",
          channel: "WhatsApp",
          recipient: policy.mobileNumber || "N/A",
          status: "Failed",
          details: `Broadcast failed: ${err.message || String(err)}`,
        });
      }
    }
  }

  return {
    success: true,
    successCount,
    failCount,
  };
}
