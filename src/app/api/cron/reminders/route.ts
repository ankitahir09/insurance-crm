import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Policy from '@/models/Policy';
import AuditLog from '@/models/AuditLog';
import { sendEmailReminder, sendWhatsAppReminder } from '@/lib/services/communication';

export const dynamic = 'force-dynamic';

// get date range for daysAhead
function getDayRange(daysAhead: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + daysAhead);

  const start = new Date(targetDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(targetDate);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export async function GET(request: NextRequest) {
  try {
    // check auth token in production
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (process.env.NODE_ENV === 'production') {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return new NextResponse('Unauthorized', { status: 401 });
      }
    }

    await dbConnect();

    // calculate target ranges for 30, 7, and 1 days
    const range30 = getDayRange(30);
    const range7 = getDayRange(7);
    const range1 = getDayRange(1);

    console.log(`[CRON] Scanning for policies expiring in exactly:
    - 30 days: ${range30.start.toLocaleDateString()} to ${range30.end.toLocaleDateString()}
    - 7 days: ${range7.start.toLocaleDateString()} to ${range7.end.toLocaleDateString()}
    - 1 day: ${range1.start.toLocaleDateString()} to ${range1.end.toLocaleDateString()}`);

    // get unmuted expiring policies
    const policies = await Policy.find({
      $or: [
        { expiryDate: { $gte: range30.start, $lte: range30.end } },
        { expiryDate: { $gte: range7.start, $lte: range7.end } },
        { expiryDate: { $gte: range1.start, $lte: range1.end } }
      ],
      isMuted: { $ne: true }
    });

    console.log(`[CRON] Found ${policies.length} policies matching automated reminder criteria.`);

    // process dispatches with isolation to prevent loop crash
    const processLogs = [];
    for (const policy of policies) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiry = new Date(policy.expiryDate);
      expiry.setHours(0, 0, 0, 0);
      const diffTime = expiry.getTime() - today.getTime();
      const daysLeft = Math.round(diffTime / (1000 * 60 * 60 * 24));

      console.log(`[CRON] Initiating notifications for: ${policy.policyNumber} (${policy.name}) - Expiring in ${daysLeft} days.`);

      let emailStatus = 'Success';
      let emailDetails = '';

      // email alert
      try {
        const emailResult = await sendEmailReminder(policy, daysLeft, false);
        emailStatus = emailResult.success ? 'Success' : 'Failed';
        emailDetails = emailResult.details;
      } catch (err: any) {
        emailStatus = 'Failed';
        emailDetails = err.message || String(err);
        console.error(`[CRON ERROR] Fault caught. Email failed for ${policy.policyNumber}:`, err);
        
        // fallback db log if notification service failed
        try {
          await AuditLog.create({
            userId: policy.userId,
            policyId: policy._id,
            action: 'CRON_REMINDER_SENT',
            channel: 'Email',
            recipient: policy.email || 'N/A',
            status: 'Failed',
            details: `Internal system crash: ${err.message || String(err)}`,
          });
        } catch (dbErr) {
          console.error('[CRON ERROR] Failed to write fallback email failure to AuditLog:', dbErr);
        }
      }

      let whatsappStatus = 'Success';
      let whatsappDetails = '';

      // whatsapp stub alert
      try {
        const whatsappResult = await sendWhatsAppReminder(policy, daysLeft, false);
        whatsappStatus = whatsappResult.success ? 'Success' : 'Failed';
        whatsappDetails = whatsappResult.details;
      } catch (err: any) {
        whatsappStatus = 'Failed';
        whatsappDetails = err.message || String(err);
        console.error(`[CRON ERROR] Fault caught. WhatsApp failed for ${policy.policyNumber}:`, err);
        
        // fallback db log if notification service failed
        try {
          await AuditLog.create({
            userId: policy.userId,
            policyId: policy._id,
            action: 'CRON_REMINDER_SENT',
            channel: 'WhatsApp',
            recipient: policy.mobileNumber || 'N/A',
            status: 'Failed',
            details: `Internal system crash: ${err.message || String(err)}`,
          });
        } catch (dbErr) {
          console.error('[CRON ERROR] Failed to write fallback WhatsApp failure to AuditLog:', dbErr);
        }
      }

      processLogs.push({
        policyNumber: policy.policyNumber,
        customerName: policy.name,
        daysRemaining: daysLeft,
        email: {
          recipient: policy.email || 'N/A',
          status: emailStatus,
          details: emailDetails
        },
        whatsapp: {
          recipient: policy.mobileNumber || 'N/A',
          status: whatsappStatus,
          details: whatsappDetails
        }
      });
    }

    return NextResponse.json({
      success: true,
      processedCount: policies.length,
      details: processLogs
    });

  } catch (error: any) {
    console.error('[CRON GENERAL ERROR] Cron execution halted:', error);
    return NextResponse.json({
      success: false,
      error: error.message || String(error)
    }, { status: 500 });
  }
}
