import { Link } from 'react-router-dom';

export function Logo() {
  return (
    <svg className="bm" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <rect width="36" height="36" rx="12" fill="#f26a2e" />
      <path d="M17 9v14a4 4 0 0 0 4 4h3M11 15h13" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Brand({ to = '/' }: { to?: string }) {
  return (
    <Link className="brand" to={to} aria-label="TopRepet, на главную">
      <Logo />
      toprepet
    </Link>
  );
}
