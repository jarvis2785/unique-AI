interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function Header({ title, subtitle, action }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-background/95 px-5 pb-3 pt-safe-top backdrop-blur safe-top">
      <div className="flex items-center justify-between pt-4">
        <div>
          <h1 className="text-page-title text-[22px]">{title}</h1>
          {subtitle && <p className="text-secondary-body mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}
