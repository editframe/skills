import { Link } from "react-router";

interface LandingNavLinkProps {
  to: string;
  children: React.ReactNode;
  onClick?: () => void;
}

export function LandingNavLink({ to, children, onClick }: LandingNavLinkProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="px-4 py-2 text-sm font-bold uppercase tracking-wider hover:bg-[var(--poster-gold)] transition-colors"
    >
      {children}
    </Link>
  );
}
