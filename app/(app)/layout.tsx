import { redirect } from 'next/navigation';
import { getAuthedUser } from '@/lib/supabase/auth';
import { BottomNav } from '@/components/layout/BottomNav';

export default async function AppShellLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthedUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {children}
      <BottomNav role={user.role} />
    </div>
  );
}
