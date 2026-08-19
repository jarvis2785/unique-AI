'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, History, LayoutGrid, type LucideIcon } from 'lucide-react';
import type { UserRole } from '@/lib/types/domain';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const OWNER_MANAGER_ITEMS: NavItem[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/history', label: 'History', icon: History },
  { href: '/manage', label: 'Manage', icon: LayoutGrid },
];

const STAFF_ITEMS: NavItem[] = [
  { href: '/search', label: 'Search', icon: Search },
  { href: '/history', label: 'History', icon: History },
];

export function BottomNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const items = role === 'staff' ? STAFF_ITEMS : OWNER_MANAGER_ITEMS;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-surface/95 backdrop-blur safe-bottom">
      <div className="mx-auto flex max-w-lg items-stretch">
        {items.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 transition active:scale-[0.98]"
              style={{ minHeight: '56px' }}
            >
              <Icon className={`h-6 w-6 ${active ? 'text-primary' : 'text-text-muted'}`} strokeWidth={active ? 2.5 : 2} />
              <span className={`text-[11px] font-medium ${active ? 'text-primary' : 'text-text-muted'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
