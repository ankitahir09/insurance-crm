'use server';

import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import Admin from '@/models/Admin';
import Policy from '@/models/Policy';
import AuditLog from '@/models/AuditLog';

// seed db with default admin and mock policies
export async function seedDatabaseAction() {
  try {
    await dbConnect();

    // 1. Seed Admin User
    const existingAdmin = await Admin.findOne({ email: 'admin@agency.com' });
    let adminCreated = false;
    let adminId = existingAdmin?._id;
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash('password123', 10);
      const newAdmin = await Admin.create({
        name: 'Agency Admin',
        email: 'admin@agency.com',
        mobile: '+15550100',
        passwordHash,
      });
      adminCreated = true;
      adminId = newAdmin._id;
    }

    // 2. Seed Mock Policies
    // Clear old policies to reset the environment
    await Policy.deleteMany({});
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Active policy: expires in 45 days
    const activeExpiry = new Date(today);
    activeExpiry.setDate(today.getDate() + 45);
    const activeIssue = new Date(activeExpiry);
    activeIssue.setFullYear(activeExpiry.getFullYear() - 1);

    // Expiring soon: expires in 25 days
    const soonExpiry = new Date(today);
    soonExpiry.setDate(today.getDate() + 25);
    const soonIssue = new Date(soonExpiry);
    soonIssue.setFullYear(soonExpiry.getFullYear() - 1);

    // Urgent: expires in 6 days
    const urgentExpiry = new Date(today);
    urgentExpiry.setDate(today.getDate() + 6);
    const urgentIssue = new Date(urgentExpiry);
    urgentIssue.setFullYear(urgentExpiry.getFullYear() - 1);

    // Imminent: expires in 1 day
    const imminentExpiry = new Date(today);
    imminentExpiry.setDate(today.getDate() + 1);
    const imminentIssue = new Date(imminentExpiry);
    imminentIssue.setFullYear(imminentExpiry.getFullYear() - 1);

    // Grace Period: expired 4 days ago
    const graceExpiry = new Date(today);
    graceExpiry.setDate(today.getDate() - 4);
    const graceIssue = new Date(graceExpiry);
    graceIssue.setFullYear(graceExpiry.getFullYear() - 1);

    // Lapsed: expired 22 days ago
    const lapsedExpiry = new Date(today);
    lapsedExpiry.setDate(today.getDate() - 22);
    const lapsedIssue = new Date(lapsedExpiry);
    lapsedIssue.setFullYear(lapsedExpiry.getFullYear() - 1);

    // Muted/DND Policy: expires in 5 days, isMuted = true
    const mutedExpiry = new Date(today);
    mutedExpiry.setDate(today.getDate() + 5);
    const mutedIssue = new Date(mutedExpiry);
    mutedIssue.setFullYear(mutedExpiry.getFullYear() - 1);

    // Seed policies with document object structures (Cloudinary preview stubs)
    const seededPoliciesData = [
      {
        name: 'John Doe',
        policyNumber: 'POL-CAR-9082',
        policyType: 'Car',
        issueDate: activeIssue,
        expiryDate: activeExpiry,
        mobileNumber: '+15550192',
        email: 'john.doe@example.com',
        documents: [
          { url: 'https://res.cloudinary.com/demo/image/upload/v1580976516/sample.pdf', type: 'PDF', label: 'Current Policy Copy', publicId: 'mock_sample_pdf_1' }
        ],
        isMuted: false,
      },
      {
        name: 'Sarah Connor',
        policyNumber: 'POL-HLT-4432',
        policyType: 'Health',
        issueDate: soonIssue,
        expiryDate: soonExpiry,
        mobileNumber: '+15550143',
        email: 'sconnor@example.com',
        documents: [
          { url: 'https://res.cloudinary.com/demo/image/upload/v1580976516/sample.pdf', type: 'PDF', label: 'Current Policy Copy', publicId: 'mock_sample_pdf_2' }
        ],
        isMuted: false,
      },
      {
        name: 'Bruce Wayne',
        policyNumber: 'POL-LIFE-0007',
        policyType: 'Life',
        issueDate: urgentIssue,
        expiryDate: urgentExpiry,
        mobileNumber: '+15550007',
        email: 'bruce@waynecorp.com',
        documents: [
          { url: 'https://res.cloudinary.com/demo/image/upload/v1580976516/sample.pdf', type: 'PDF', label: 'Current Policy Copy', publicId: 'mock_sample_pdf_3' }
        ],
        isMuted: false,
      },
      {
        name: 'Peter Parker',
        policyNumber: 'POL-HOME-1024',
        policyType: 'Home',
        issueDate: imminentIssue,
        expiryDate: imminentExpiry,
        mobileNumber: '+15551024',
        email: 'spidey@dailybugle.com',
        documents: [
          { url: 'https://res.cloudinary.com/demo/image/upload/v1580976516/sample.pdf', type: 'PDF', label: 'Current Policy Copy', publicId: 'mock_sample_pdf_4' }
        ],
        isMuted: false,
      },
      {
        name: 'Clark Kent',
        policyNumber: 'POL-TRAV-7788',
        policyType: 'Travel',
        issueDate: graceIssue,
        expiryDate: graceExpiry,
        mobileNumber: '+15557788',
        email: 'ckent@dailyplanet.com',
        documents: [
          { url: 'https://res.cloudinary.com/demo/image/upload/v1580976516/sample.pdf', type: 'PDF', label: 'Current Policy Copy', publicId: 'mock_sample_pdf_5' }
        ],
        isMuted: false,
      },
      {
        name: 'Tony Stark',
        policyNumber: 'POL-LIFE-3000',
        policyType: 'Life',
        issueDate: lapsedIssue,
        expiryDate: lapsedExpiry,
        mobileNumber: '+15553000',
        email: 'tony@starkindustries.com',
        documents: [
          { url: 'https://res.cloudinary.com/demo/image/upload/v1580976516/sample.pdf', type: 'PDF', label: 'Current Policy Copy', publicId: 'mock_sample_pdf_6' }
        ],
        isMuted: false,
      },
      {
        name: 'Selina Kyle',
        policyNumber: 'POL-CAR-1313',
        policyType: 'Car',
        issueDate: mutedIssue,
        expiryDate: mutedExpiry,
        mobileNumber: '+15551313',
        email: 'cat@gotham.com',
        documents: [
          { url: 'https://res.cloudinary.com/demo/image/upload/v1580976516/sample.pdf', type: 'PDF', label: 'Current Policy Copy', publicId: 'mock_sample_pdf_7' }
        ],
        isMuted: true,
      },
    ].map(p => ({ ...p, userId: adminId }));

    await Policy.insertMany(seededPoliciesData);

    // Record to AuditLog
    await AuditLog.create({
      userId: adminId,
      action: 'SYSTEM_INIT',
      channel: 'System',
      recipient: 'Database',
      status: 'Success',
      details: 'Database successfully seeded with new Admin user and updated policy document objects.',
    });

    return { 
      success: true, 
      adminCreated,
      message: 'Database seeded successfully. Access using: admin@agency.com / password123'
    };
  } catch (error: any) {
    console.error('Seeding database failed:', error);
    return {
      success: false,
      message: error.message || String(error)
    };
  }
}
