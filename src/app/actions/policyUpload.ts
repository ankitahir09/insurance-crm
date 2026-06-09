'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Policy from '@/models/Policy';
import AuditLog from '@/models/AuditLog';
import cloudinary from '@/lib/cloudinary';
import { revalidatePath } from 'next/cache';

// create a new policy record
export async function createPolicyAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    throw new Error('Authentication required for this operation');
  }

  await dbConnect();

  const name = formData.get('name') as string;
  const policyNumber = formData.get('policyNumber') as string;
  const policyType = formData.get('policyType') as any;
  const issueDateStr = formData.get('issueDate') as string;
  const expiryDateStr = formData.get('expiryDate') as string;
  const mobileNumber = formData.get('mobileNumber') as string;
  const email = formData.get('email') as string;
  const isMuted = formData.get('isMuted') === 'true';

  if (!name || !policyNumber || !policyType || !issueDateStr || !expiryDateStr) {
    throw new Error('Please fill in all required fields');
  }

  const uploadedDocuments: Array<{ url: string; type: 'PDF' | 'Image' | 'Other'; label: string; publicId?: string }> = [];
  const standardLabels = ['Aadhaar Card', 'PAN Card', 'Vehicle RC', 'Current Policy Copy'];

  for (const label of standardLabels) {
    const file = formData.get(`doc_${label}`) as File;
    if (file && file.size > 0) {
      const uploaded = await uploadSingleFile(file, label);
      uploadedDocuments.push(uploaded);
    }
  }

  const otherFile = formData.get('doc_Other') as File;
  const otherLabel = (formData.get('otherLabel') as string || 'Other').trim();
  if (otherFile && otherFile.size > 0) {
    const uploaded = await uploadSingleFile(otherFile, otherLabel);
    uploadedDocuments.push(uploaded);
  }

  const policy = await Policy.create({
    userId: session.user.id,
    name,
    policyNumber,
    policyType,
    issueDate: new Date(issueDateStr),
    expiryDate: new Date(expiryDateStr),
    mobileNumber,
    email,
    documents: uploadedDocuments,
    isMuted,
  });

  await AuditLog.create({
    userId: session.user.id,
    policyId: policy._id,
    action: 'SYSTEM_INIT',
    channel: 'System',
    recipient: email || mobileNumber || 'N/A',
    status: 'Success',
    details: `Policy record created. Type: ${policyType}, Number: ${policyNumber}`,
  });

  revalidatePath('/');
  return { 
    success: true, 
    policyId: policy._id.toString() 
  };
}

// update existing policy and upload new docs
export async function updatePolicyAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    throw new Error('Authentication required for this operation');
  }

  await dbConnect();

  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const policyNumber = formData.get('policyNumber') as string;
  const policyType = formData.get('policyType') as any;
  const issueDateStr = formData.get('issueDate') as string;
  const expiryDateStr = formData.get('expiryDate') as string;
  const mobileNumber = formData.get('mobileNumber') as string;
  const email = formData.get('email') as string;
  const isMuted = formData.get('isMuted') === 'true';

  if (!id || !name || !policyNumber || !policyType || !issueDateStr || !expiryDateStr) {
    throw new Error('Please fill in all required fields');
  }

  const policy = await Policy.findOne({ _id: id, userId: session.user.id });
  if (!policy) {
    throw new Error('Policy record not found or access denied');
  }

  // Preserve existing documents and handle new uploads
  const updatedDocuments = [...policy.documents];
  const standardLabels = ['Aadhaar Card', 'PAN Card', 'Vehicle RC', 'Current Policy Copy'];

  for (const label of standardLabels) {
    const file = formData.get(`doc_${label}`) as File;
    if (file && file.size > 0) {
      const uploaded = await uploadSingleFile(file, label);
      updatedDocuments.push(uploaded);
    }
  }

  const otherFile = formData.get('doc_Other') as File;
  const otherLabel = (formData.get('otherLabel') as string || 'Other').trim();
  if (otherFile && otherFile.size > 0) {
    const uploaded = await uploadSingleFile(otherFile, otherLabel);
    updatedDocuments.push(uploaded);
  }

  // Update policy fields
  policy.name = name.trim();
  policy.policyNumber = policyNumber.trim();
  policy.policyType = policyType;
  policy.issueDate = new Date(issueDateStr);
  policy.expiryDate = new Date(expiryDateStr);
  policy.mobileNumber = mobileNumber.trim();
  policy.email = email.trim().toLowerCase();
  policy.documents = updatedDocuments;
  policy.isMuted = isMuted;

  await policy.save();

  // Log update to Audit Trail
  await AuditLog.create({
    userId: session.user.id,
    policyId: policy._id,
    action: 'SYSTEM_INIT',
    channel: 'System',
    recipient: email || mobileNumber || 'N/A',
    status: 'Success',
    details: `Policy record updated. Holder: ${name}, Number: ${policyNumber}`,
  });

  revalidatePath('/');
  return { success: true };
}

// upload file to cloudinary
async function uploadSingleFile(file: File, label: string) {
  let type: 'PDF' | 'Image' | 'Other' = 'Other';
  if (file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf')) {
    type = 'PDF';
  } else if (file.type.startsWith('image/')) {
    type = 'Image';
  }

  const hasCloudinary = process.env.CLOUDINARY_CLOUD_NAME && 
                        process.env.CLOUDINARY_API_KEY && 
                        process.env.CLOUDINARY_API_SECRET;

  if (!hasCloudinary) {
    throw new Error('Cloudinary environment variables are not configured in .env.local.');
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult: any = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'insurance_crm_documents',
          resource_type: type === 'PDF' ? 'raw' : 'auto',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    return {
      url: uploadResult.secure_url,
      type,
      label,
      publicId: uploadResult.public_id,
    };
  } catch (err: any) {
    console.error('Cloudinary upload failure:', err);
    throw new Error(`File upload failed for label "${label}": ${err.message || String(err)}`);
  }
}
