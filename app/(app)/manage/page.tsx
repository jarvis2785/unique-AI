import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Package, SlidersHorizontal, Upload, Users } from 'lucide-react';
import { getAuthedUser } from '@/lib/supabase/auth';
import { Header } from '@/components/layout/Header';

export default async function ManagePage() {
  const user = await getAuthedUser();
  if (!user) redirect('/login');
  if (user.role === 'staff') redirect('/search');

  const sections = [
    { href: '/manage/products', icon: Package, title: 'Products', description: 'Add, edit, and remove catalog items' },
    {
      href: '/manage/stock-adjustment',
      icon: SlidersHorizontal,
      title: 'Stock Adjustment',
      description: 'Correct quantities after a physical count',
    },
    ...(user.role === 'owner'
      ? [{ href: '/manage/staff', icon: Users, title: 'Staff Accounts', description: 'Add, assign roles, deactivate' }]
      : []),
    { href: '/manage/import', icon: Upload, title: 'Import', description: 'Upload a Miracle CSV export' },
  ];

  return (
    <div>
      <Header title="Manage" />
      <div className="space-y-2.5 px-4 py-4">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="flex items-center gap-3.5 rounded-xl border border-elevated bg-surface px-4 py-4 active:bg-elevated"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <section.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-text">{section.title}</p>
              <p className="truncate text-sm text-text-muted">{section.description}</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-text-muted" />
          </Link>
        ))}
      </div>
    </div>
  );
}
