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
      <div className="space-y-3 px-5 py-4">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="card-surface flex items-center gap-4 rounded-2xl px-5 py-5 transition active:scale-[0.98] active:bg-elevated/40"
          >
            <div className="icon-gradient flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-primary">
              <section.icon className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-product-name text-[17px]">{section.title}</p>
              <p className="text-secondary-body mt-1">{section.description}</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-text-muted" />
          </Link>
        ))}
      </div>
    </div>
  );
}
