"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Policy from "@/models/Policy";
import AuditLog from "@/models/AuditLog";
import { replaceTokens } from "@/lib/services/communication";
import nodemailer from "nodemailer";

function getTransporter() {
  const emailUser = process.env.EMAIL_USER;
  const emailAppPassword = process.env.EMAIL_APP_PASSWORD;

  if (!emailUser || !emailAppPassword) {
    throw new Error(
      "EMAIL_USER or EMAIL_APP_PASSWORD is not configured in the environment variables.",
    );
  }

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: emailUser,
      pass: emailAppPassword,
    },
  });
}

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

        const emailUser = process.env.EMAIL_USER;
        const transporter = getTransporter();

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
