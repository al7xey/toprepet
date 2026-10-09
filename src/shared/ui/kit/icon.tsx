import type { SVGProps } from 'react';

/* Icon set of the UI kit (24×24, 2px stroke). Kept inline so the shapes match the mockups exactly. */
const paths = {
  check: <path fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" d="M5 12.5l4.5 4.5L19 7.5" />,
  search: <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></g>,
  star: <path fill="currentColor" d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z" />,
  heart: <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" d="M12 20s-7.5-4.6-9.2-9.3C1.7 7.5 3.9 4.5 7.1 4.5c2 0 3.4 1.1 4.9 3 1.5-1.9 2.9-3 4.9-3 3.2 0 5.4 3 4.3 6.2C19.5 15.4 12 20 12 20z" />,
  right: <path fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" d="M9 5.5l6.5 6.5L9 18.5" />,
  gift: <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><rect x="4" y="9" width="16" height="11" rx="2.5" /><path d="M3 9h18M12 9v11M12 9c-1.5-3.5-5.5-4-5.5-1.5S12 9 12 9zm0 0c1.5-3.5 5.5-4 5.5-1.5S12 9 12 9z" /></g>,
  shield: <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" d="M12 3.5l7.5 3v5.5c0 4.5-3.2 7.6-7.5 8.5-4.3-.9-7.5-4-7.5-8.5V6.5z" />,
  user: <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8.5" r="4" /><path d="M4.5 20c.9-3.7 3.8-5.8 7.5-5.8s6.6 2.1 7.5 5.8" /></g>,
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      {paths[name]}
    </svg>
  );
}

export function LogoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 36 36" aria-hidden="true" {...props}>
      <rect width="36" height="36" rx="11" fill="currentColor" />
      <path d="M17 9v14a4 4 0 0 0 4 4h3M11 15h13" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
