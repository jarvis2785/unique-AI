interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function Header({ title, subtitle, action }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-elevated bg-background/95 px-4 pb-3 pt-safe-top backdrop-blur safe-top">
      <div className="flex items-center justify-between pt-3">
        <div>
          <h1 className="text-xl font-bold text-text">{title}</h1>
          {subtitle && <p className="text-sm text-text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}
