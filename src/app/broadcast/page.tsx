import dbConnect from '@/lib/db';
import Policy from '@/models/Policy';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import BroadcastForm from '@/components/BroadcastForm';

export const dynamic = 'force-dynamic';

export default async function BroadcastPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }

  await dbConnect();

  // Load all active policies (expiry date is in the future)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activePolicies = await Policy.find({ expiryDate: { $gte: today } })
    .sort({ name: 1 })
    .lean();

  const serializedPolicies = activePolicies.map((p: any) => ({
    id: p._id.toString(),
    name: p.name,
    policyNumber: p.policyNumber,
    policyType: p.policyType,
    mobileNumber: p.mobileNumber || '',
    email: p.email || '',
  }));

  return <BroadcastForm policies={serializedPolicies} />;
}
