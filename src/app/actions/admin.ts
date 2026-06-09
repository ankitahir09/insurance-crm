'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Admin from '@/models/Admin';
import AuditLog from '@/models/AuditLog';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';

// update admin profile
export async function updateAdminProfileAction(data: {
  name: string;
  email: string;
  mobile: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    throw new Error('Authentication required for this operation');
  }

  await dbConnect();

  const admin = await Admin.findOne({ email: session.user.email });
  if (!admin) {
    throw new Error('Logged-in administrator profile not found');
  }

  // Check unique email constraints if email is updated
  const newEmail = data.email.trim().toLowerCase();
  if (newEmail !== admin.email) {
    const emailTaken = await Admin.findOne({ email: newEmail });
    if (emailTaken) {
      throw new Error('This email is already in use by another administrator');
    }
  }

  const oldEmail = admin.email;
  admin.name = data.name.trim();
  admin.email = newEmail;
  admin.mobile = data.mobile.trim();
  await admin.save();

  // Create Audit Log
  await AuditLog.create({
    action: 'SYSTEM_INIT',
    channel: 'System',
    recipient: admin.email,
    status: 'Success',
    details: `Admin profile details updated by ${session.user.name || oldEmail}.`,
  });

  revalidatePath('/profile');
  return { 
    success: true, 
    admin: {
      name: admin.name,
      email: admin.email,
      mobile: admin.mobile
    }
  };
}

// change admin password after verifying current password
export async function changeAdminPasswordAction(data: {
  oldPassword: string;
  newPassword: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    throw new Error('Authentication required for this operation');
  }

  await dbConnect();

  const admin = await Admin.findOne({ email: session.user.email });
  if (!admin) {
    throw new Error('Logged-in administrator profile not found');
  }

  // Validate old password
  const isMatch = await bcrypt.compare(data.oldPassword, admin.passwordHash);
  if (!isMatch) {
    throw new Error('The current password you entered is incorrect');
  }

  // Hash and save new password
  admin.passwordHash = await bcrypt.hash(data.newPassword, 10);
  await admin.save();

  // Create Audit Log
  await AuditLog.create({
    action: 'SYSTEM_INIT',
    channel: 'System',
    recipient: admin.email,
    status: 'Success',
    details: `Admin password updated securely by ${session.user.name || admin.email}.`,
  });

  return { success: true };
}

// update agent email settings for dynamic SMTP
export async function updateEmailSettingsAction(data: {
  smtpEmail: string;
  smtpAppPassword: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    throw new Error('Authentication required for this operation');
  }

  await dbConnect();

  const admin = await Admin.findOne({ email: session.user.email });
  if (!admin) {
    throw new Error('Logged-in administrator profile not found');
  }

  admin.agentEmailSettings = {
    smtpEmail: data.smtpEmail.trim(),
    smtpAppPassword: data.smtpAppPassword.trim(),
    isConfigured: true,
  };

  await admin.save();

  await AuditLog.create({
    userId: session.user.id,
    action: 'SYSTEM_INIT',
    channel: 'System',
    recipient: admin.email,
    status: 'Success',
    details: `Agent SMTP email settings updated securely by ${session.user.name || admin.email}.`,
  });

  revalidatePath('/profile');
  return { success: true };
}
