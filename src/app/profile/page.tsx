import dbConnect from '@/lib/db';
import Admin from '@/models/Admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ProfileForm from '@/components/ProfileForm';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    redirect('/login');
  }

  await dbConnect();

  const admin = await Admin.findOne({ email: session.user.email }).lean();

  if (!admin) {
    redirect('/login');
  }

  const serializedAdmin = {
    name: admin.name,
    email: admin.email,
    mobile: admin.mobile,
  };

  return <ProfileForm admin={serializedAdmin} />;
}
