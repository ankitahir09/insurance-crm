import dbConnect from "@/lib/db";
import AuditLog from "@/models/AuditLog";
import { IPolicy } from "@/models/Policy";
import Admin from "@/models/Admin";
import nodemailer from "nodemailer";


interface MessageTemplate {
  subject: string;
  emailBody: string;
  whatsappText: string;
}

// Hardcoded stage-based templates
const TEMPLATES: Record<string, MessageTemplate> = {
  "30": {
    subject: "[Action Required] Policy Renewal Reminder - {{policy_number}}",
    emailBody:
      "Hi {{name}},\n\nYour {{policy_type}} insurance policy (No. {{policy_number}}) is due for renewal in 30 days on {{expiry_date}}.\n\nPlease contact our agency to renew your coverage.\n\nBest regards,\nChanakya Advisory Careers",
    whatsappText:
      "Hi {{name}}, your {{policy_type}} policy {{policy_number}} is expiring in 30 days on {{expiry_date}}. Reply to renew.",
  },
  "7": {
    subject: "[URGENT] Insurance Policy Expiring in 7 Days - {{policy_number}}",
    emailBody:
      "Hi {{name}},\n\nThis is an urgent reminder that your {{policy_type}} insurance policy (No. {{policy_number}}) is expiring in 7 days on {{expiry_date}}.\n\nPlease renew immediately to ensure continuous coverage.\n\nBest regards,\nChanakya Advisory Careers",
    whatsappText:
      "URGENT: Hi {{name}}, your {{policy_type}} policy {{policy_number}} is expiring in 7 days on {{expiry_date}}. Reply to renew immediately.",
  },
  "1": {
    subject: "[FINAL WARNING] Policy Expiring Tomorrow - {{policy_number}}",
    emailBody:
      "Hi {{name}},\n\nThis is your final notice that your {{policy_type}} insurance policy (No. {{policy_number}}) will expire tomorrow on {{expiry_date}}.\n\nPlease renew now to avoid policy lapse.\n\nBest regards,\nChanakya Advisory Careers",
    whatsappText:
      "FINAL NOTICE: Hi {{name}}, your {{policy_type}} policy {{policy_number}} expires tomorrow! Reply to renew now.",
  },
  generic: {
    subject: "Insurance Policy Renewal Notice - {{policy_number}}",
    emailBody:
      "Hi {{name}},\n\nThis is a friendly reminder that your {{policy_type}} insurance policy (No. {{policy_number}}) is expiring on {{expiry_date}}.\n\nPlease contact us to arrange your renewal.\n\nBest regards,\nChanakya Advisory Careers",
    whatsappText:
      "Hi {{name}}, this is a reminder that your {{policy_type}} policy {{policy_number}} is expiring on {{expiry_date}}. Reply to renew.",
  },
};

// Formats body text with dynamic policy tokens
export function replaceTokens(text: string, policy: IPolicy): string {
  const formattedDate = new Date(policy.expiryDate).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );

  return text
    .replace(/\{\{name\}\}/gi, policy.name)
    .replace(/\{\{policy_number\}\}/gi, policy.policyNumber)
    .replace(/\{\{policy_type\}\}/gi, policy.policyType)
    .replace(/\{\{expiry_date\}\}/gi, formattedDate);
}

// Get active template based on days remaining
function getTemplate(daysLeft?: number): MessageTemplate {
  if (daysLeft === 30 || daysLeft === 7 || daysLeft === 1) {
    return TEMPLATES[String(daysLeft)];
  }
  return TEMPLATES.generic;
}

// Gmail SMTP configuration (Dynamic)
export async function getDynamicTransporter(userId: string) {
  await dbConnect();
  const admin = await Admin.findById(userId);

  if (!admin || !admin.agentEmailSettings?.isConfigured) {
    throw new Error(
      "Agent SMTP credentials are not configured. Please update them in your Profile Settings.",
    );
  }

  const { smtpEmail, smtpAppPassword } = admin.agentEmailSettings;

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: smtpEmail,
      pass: smtpAppPassword,
    },
  });

  return { transporter, emailUser: smtpEmail };
}

// Sends standard email alerts via nodemailer SMTP
export async function sendEmailReminder(
  policy: IPolicy,
  daysLeft?: number,
  isManual: boolean = false,
): Promise<{ success: boolean; details: string }> {
  const actionName = isManual ? "MANUAL_EMAIL_DISPATCH" : "CRON_REMINDER_SENT";
  const recipient = policy.email || "N/A";

  try {
    if (!policy.email) {
      throw new Error("Missing customer email address.");
    }

    const template = getTemplate(daysLeft);
    const subject = replaceTokens(template.subject, policy);
    const body = replaceTokens(template.emailBody, policy);

    console.log(`[EMAIL DISPATCH]
Mode: ${isManual ? "MANUAL" : "AUTOMATED"}
To: ${policy.email}
Subject: ${subject}
Body:
${body}
----------------------------------------`);

    const { transporter, emailUser } = await getDynamicTransporter(policy.userId.toString());

    const info = await transporter.sendMail({
      from: `"Agency Alerts" <${emailUser}>`,
      to: policy.email,
      subject: subject,
      text: body,
    });

    console.log(
      `[NODEMAILER] Email sent successfully. Message ID: ${info.messageId}`,
    );

    await dbConnect();
    await AuditLog.create({
      userId: policy.userId,
      policyId: policy._id,
      action: actionName,
      channel: "Email",
      recipient: policy.email,
      status: "Success",
      details: `Email sent via Gmail SMTP. Message ID: ${info.messageId}`,
    });

    return {
      success: true,
      details: `Email sent successfully via Gmail SMTP. ID: ${info.messageId}`,
    };
  } catch (error: any) {
    console.error("[EMAIL ERROR] Failed to send email via Nodemailer:", error);

    try {
      await dbConnect();
      await AuditLog.create({
        userId: policy.userId,
        policyId: policy._id,
        action: actionName,
        channel: "Email",
        recipient: recipient,
        status: "Failed",
        details: `Failed to send email: ${error.message || String(error)}`,
      });
    } catch (dbErr) {
      console.error("[EMAIL ERROR] Failed to write failure audit log:", dbErr);
    }

    return { success: false, details: error.message || String(error) };
  }
}

// WhatsApp dispatcher (stubbed out for console & DB logging)
export async function sendWhatsAppReminder(
  policy: IPolicy,
  daysLeft?: number,
  isManual: boolean = false,
): Promise<{ success: boolean; details: string }> {
  const actionName = isManual
    ? "MANUAL_WHATSAPP_DISPATCH"
    : "CRON_REMINDER_SENT";
  const recipient = policy.mobileNumber || "N/A";

  try {
    const template = getTemplate(daysLeft);
    const text = replaceTokens(template.whatsappText, policy);

    console.log(`[WHATSAPP DISPATCH STUB]
Mode: ${isManual ? "MANUAL" : "AUTOMATED"}
To: ${recipient}
Message: ${text}
----------------------------------------`);

    await dbConnect();
    await AuditLog.create({
      userId: policy.userId,
      policyId: policy._id,
      action: actionName,
      channel: "WhatsApp",
      recipient: recipient,
      status: "Success",
      details: `WhatsApp stub sent successfully. Message: "${text}"`,
    });

    return {
      success: true,
      details: "WhatsApp reminder processed successfully (Stub).",
    };
  } catch (error: any) {
    console.error("[WHATSAPP ERROR] Bypassing WhatsApp error:", error);
    // Always return success as per the stub requirement
    return {
      success: true,
      details: `WhatsApp stub bypassed error: ${error.message || String(error)}`,
    };
  }
}
