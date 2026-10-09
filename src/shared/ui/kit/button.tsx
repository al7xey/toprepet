import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Variant = 'primary' | 'tinted' | 'gray' | 'white';
type Size = 'l' | 'm' | 's';

interface ButtonProps {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  block?: boolean;
  circle?: boolean;
  to?: string;
  type?: 'button' | 'submit';
  className?: string;
  'aria-label'?: string;
  onClick?: () => void;
}

export function buttonClass({ variant = 'gray', size = 'l', block, circle, className }: Omit<ButtonProps, 'children'>) {
  return [
    'tr-btn',
    `tr-btn--${variant}`,
    size !== 'l' && `tr-btn--${size}`,
    block && 'tr-btn--block',
    circle && 'tr-btn--circle',
    className,
  ].filter(Boolean).join(' ');
}

export function Button({ children, to, type = 'button', onClick, ...rest }: ButtonProps) {
  const className = buttonClass(rest);
  if (to) {
    return <Link className={className} to={to} aria-label={rest['aria-label']} onClick={onClick}>{children}</Link>;
  }
  return <button className={className} type={type} aria-label={rest['aria-label']} onClick={onClick}>{children}</button>;
}
