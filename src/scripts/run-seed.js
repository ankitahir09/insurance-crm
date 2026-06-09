const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '../../.env.local');
let MONGODB_URI = 'mongodb://localhost:27017/insurance-crm';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const uriMatch = envContent.match(/MONGODB_URI=(.*)/);
  if (uriMatch && uriMatch[1]) {
    MONGODB_URI = uriMatch[1].trim();
  }
}

console.log('=== INSURANCE CRM SEED RUNNER ===');
console.log('Target MongoDB URI:', MONGODB_URI);

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully.');

    // Define Inline Schemas in JS to bypass ESM/TS compile constraints during Node execution
    const AdminSchema = new mongoose.Schema({
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      mobile: { type: String, required: true },
      passwordHash: { type: String, required: true },
    }, { timestamps: true });

    const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);

    const DocumentItemSchema = new mongoose.Schema({
      url: { type: String, required: true },
      type: { type: String, enum: ['PDF', 'Image', 'Other'], required: true },
      label: { type: String, required: true },
      publicId: { type: String, required: false },
    }, { _id: false });

    const PolicySchema = new mongoose.Schema({
      name: { type: String, required: true },
      policyNumber: { type: String, required: true, unique: true },
      policyType: { type: String, enum: ['Car', 'Health', 'Life', 'Home', 'Travel', 'Other'], required: true },
      issueDate: { type: Date, required: true },
      expiryDate: { type: Date, required: true },
      mobileNumber: { type: String, default: '' },
      email: { type: String, default: '' },
      documents: { type: [DocumentItemSchema], default: [] },
      isMuted: { type: Boolean, default: false },
    }, { timestamps: true });

    const Policy = mongoose.models.Policy || mongoose.model('Policy', PolicySchema);

    const AuditLogSchema = new mongoose.Schema({
      policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Policy' },
      action: { type: String, required: true },
      channel: { type: String, required: true },
      recipient: { type: String, default: '' },
      status: { type: String, required: true },
      details: { type: String, default: '' },
      timestamp: { type: Date, default: Date.now },
    });

    const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);

    // 1. Seed Admin credentials
    const existingAdmin = await Admin.findOne({ email: 'admin@agency.com' });
    let adminId = existingAdmin?._id;
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash('password123', 10);
      const newAdmin = await Admin.create({
        name: 'Agency Admin',
        email: 'admin@agency.com',
        mobile: '+15550100',
        passwordHash,
      });
      adminId = newAdmin._id;
      console.log('Seeded Admin account: admin@agency.com / password123');
    } else {
      console.log('Admin account already exists in DB.');
    }

    // 2. Seed Mock Policyholders
    await Policy.deleteMany({});
    console.log('Cleared existing policy records.');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeExpiry = new Date(today); activeExpiry.setDate(today.getDate() + 45);
    const activeIssue = new Date(activeExpiry); activeIssue.setFullYear(activeExpiry.getFullYear() - 1);

    const soonExpiry = new Date(today); soonExpiry.setDate(today.getDate() + 25);
    const soonIssue = new Date(soonExpiry); soonIssue.setFullYear(soonExpiry.getFullYear() - 1);

    const urgentExpiry = new Date(today); urgentExpiry.setDate(today.getDate() + 6);
    const urgentIssue = new Date(urgentExpiry); urgentIssue.setFullYear(urgentExpiry.getFullYear() - 1);

    const imminentExpiry = new Date(today); imminentExpiry.setDate(today.getDate() + 1);
    const imminentIssue = new Date(imminentExpiry); imminentIssue.setFullYear(imminentExpiry.getFullYear() - 1);

    const graceExpiry = new Date(today); graceExpiry.setDate(today.getDate() - 4);
    const graceIssue = new Date(graceExpiry); graceIssue.setFullYear(graceExpiry.getFullYear() - 1);

    const lapsedExpiry = new Date(today); lapsedExpiry.setDate(today.getDate() - 22);
    const lapsedIssue = new Date(lapsedExpiry); lapsedIssue.setFullYear(lapsedExpiry.getFullYear() - 1);

    const mutedExpiry = new Date(today); mutedExpiry.setDate(today.getDate() + 5);
    const mutedIssue = new Date(mutedExpiry); mutedIssue.setFullYear(mutedExpiry.getFullYear() - 1);

    const seededPoliciesData = [
      {
        name: 'John Doe',
        policyNumber: 'POL-CAR-9082',
        policyType: 'Car',
        issueDate: activeIssue,
        expiryDate: activeExpiry,
        mobileNumber: '+15550192',
        email: 'john.doe@example.com',
        documents: [{ url: 'https://res.cloudinary.com/demo/image/upload/v1580976516/sample.pdf', type: 'PDF', label: 'Current Policy Copy', publicId: 'mock_sample_pdf_1' }],
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
        documents: [{ url: 'https://res.cloudinary.com/demo/image/upload/v1580976516/sample.pdf', type: 'PDF', label: 'Current Policy Copy', publicId: 'mock_sample_pdf_2' }],
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
        documents: [{ url: 'https://res.cloudinary.com/demo/image/upload/v1580976516/sample.pdf', type: 'PDF', label: 'Current Policy Copy', publicId: 'mock_sample_pdf_3' }],
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
        documents: [{ url: 'https://res.cloudinary.com/demo/image/upload/v1580976516/sample.pdf', type: 'PDF', label: 'Current Policy Copy', publicId: 'mock_sample_pdf_4' }],
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
        documents: [{ url: 'https://res.cloudinary.com/demo/image/upload/v1580976516/sample.pdf', type: 'PDF', label: 'Current Policy Copy', publicId: 'mock_sample_pdf_5' }],
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
        documents: [{ url: 'https://res.cloudinary.com/demo/image/upload/v1580976516/sample.pdf', type: 'PDF', label: 'Current Policy Copy', publicId: 'mock_sample_pdf_6' }],
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
        documents: [{ url: 'https://res.cloudinary.com/demo/image/upload/v1580976516/sample.pdf', type: 'PDF', label: 'Current Policy Copy', publicId: 'mock_sample_pdf_7' }],
        isMuted: true,
      },
    ].map(p => ({ ...p, userId: adminId }));

    await Policy.create(seededPoliciesData);
    console.log('Seeded 7 mock policyholder records.');

    // Log the seed initialization to AuditLog
    await AuditLog.create({
      userId: adminId,
      action: 'SYSTEM_INIT',
      channel: 'System',
      recipient: 'Database',
      status: 'Success',
      details: 'Database successfully seeded via standalone runner script.',
    });

    await mongoose.disconnect();
    console.log('Database disconnected. Seeding completed successfully!');
  } catch (err) {
    console.error('Error occurred during database seeding:', err);
    process.exit(1);
  }
}

run();
