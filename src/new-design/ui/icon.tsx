import type { CSSProperties } from 'react';
import { iconAliases, iconArtwork } from './icon-artwork';
import './icon.css';

/** Shared minimal monochrome SVGs for navigation, forms and the editor. */
export function Icon({ name, style, size, className = '' }: { name: string; style?: CSSProperties; size?: number; className?: string }) {
  const canonical = iconAliases[name] ?? name;
  return (
    <svg
      className={`i i-${name} ${className}`.trim()}
      data-icon={canonical}
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      width={size ?? 22}
      height={size ?? 22}
      fill="none"
      stroke="var(--icon-ink,#202020)"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={size ? { ...style, width: size, height: size } : style}
    >
      {iconArtwork[canonical] ?? iconArtwork.help}
    </svg>
  );
}

export function achievementIcon(title: string) {
  if (/диплом|университет|институт|магистр|бакалавр|образован|педагог|специалитет/i.test(title)) return 'school';
  if (/язык|англий|cambridge|ielts|toefl|fce|b2|c1|c2/i.test(title)) return 'globe';
  if (/сертификат|квалификац/i.test(title)) return 'doc';
  if (/курс|методик/i.test(title)) return 'book';
  return 'star';
}
