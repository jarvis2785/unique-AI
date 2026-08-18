import { redirect } from 'next/navigation';
import { getAuthedUser } from '@/lib/supabase/auth';
import { HomeDashboard } from '@/components/home/HomeDashboard';

export default async function HomePage() {
  const user = await getAuthedUser();

  if (!user) redirect('/login');
  if (user.role === 'staff') redirect('/search');

  return <HomeDashboard fullName={user.fullName} />;
}
