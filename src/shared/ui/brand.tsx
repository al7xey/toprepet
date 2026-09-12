import { Link } from 'react-router-dom';
export function Brand() {
  return (
    <Link className="brand" to="/" aria-label="TopRepet — главная">
      <svg
        className="brand-symbol"
        viewBox="0 0 36 36"
        fill="none"
        aria-hidden="true"
      >
        <rect width="36" height="36" rx="12" fill="currentColor" />
        <circle cx="18" cy="10" r="2.6" fill="white" />
        <path d="M18 15v11M18 17l-6 4M18 17l6 4M14.5 28h7" stroke="white" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>toprepet</span>
    </Link>
  );
}
