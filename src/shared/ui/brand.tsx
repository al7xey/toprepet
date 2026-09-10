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
        <path
          d="M10 13h16M15 9v15c0 3 2 4 5 4h2M24 18v10"
          stroke="white"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>toprepet</span>
    </Link>
  );
}
