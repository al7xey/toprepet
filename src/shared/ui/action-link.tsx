import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { telegramLink } from '../config/site';
export function ActionLink({
  children = 'Написать в Telegram',
  topic,
  className = '',
}: {
  children?: ReactNode;
  topic?: string;
  className?: string;
}) {
  return (
    <a
      className={`button ${className}`}
      href={telegramLink(topic)}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <ArrowUpRight size={19} aria-hidden="true" />
    </a>
  );
}
