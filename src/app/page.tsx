import dbConnect from '@/lib/db';
import Policy from '@/models/Policy';
import AuditLog from '@/models/AuditLog';
import Dashboard from '@/components/Dashboard';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    redirect('/login');
  }

  await dbConnect();

  // Fetch policies sorted by expiry date isolated to the logged-in admin
  const policies = await Policy.find({ userId: session.user.id }).sort({ expiryDate: 1 }).lean();

  // Fetch audit logs sorted by newest first isolated to the logged-in admin
  const logs = await AuditLog.find({ userId: session.user.id })
    .sort({ timestamp: -1 })
    .limit(200)
    .lean();

  // Convert MongoDB document fields (ObjectIds and Dates) to JSON-serializable structures
  const serializedPolicies = policies.map((p: any) => ({
    id: p._id.toString(),
    name: p.name,
    policyNumber: p.policyNumber,
    policyType: p.policyType,
    issueDate: p.issueDate.toISOString(),
    expiryDate: p.expiryDate.toISOString(),
    mobileNumber: p.mobileNumber || '',
    email: p.email || '',
    documents: (p.documents || []).map((doc: any) => ({
      url: doc.url,
      type: doc.type,
      label: doc.label || '',
      publicId: doc.publicId || '',
    })),
    isMuted: p.isMuted,
  }));

  const serializedLogs = logs.map((l: any) => ({
    id: l._id.toString(),
    policyId: l.policyId ? l.policyId.toString() : null,
    action: l.action,
    channel: l.channel,
    recipient: l.recipient || '',
    status: l.status,
    details: l.details || '',
    timestamp: l.timestamp.toISOString(),
  }));

  return (
    <Dashboard 
      initialPolicies={serializedPolicies} 
      initialLogs={serializedLogs} 
    />
  );
}
