import { Link } from 'react-router-dom';

import { Icon } from './icon';

export type Tone = 'orange' | 'indigo' | 'green' | 'plum' | 'sand' | 'teal';

export interface Direction {
  tone: Tone;
  audience: string;
  title: string;
  text: string;
  to: string;
}

export function DirectionTiles({ items, label }: { items: readonly Direction[]; label: string }) {
  return (
    <ul className="tr-dirs" aria-label={label}>
      {items.map(({ tone, audience, title, text, to }) => (
        <li key={title} style={{ display: 'contents' }}>
          <Link className="tr-dir" to={to}>
            <span className={`tr-tone tr-tone--${tone}`} aria-hidden="true" />
            <span className="tx">
              <small>{audience}</small>
              <b>{title}</b>
              <span>{text}</span>
            </span>
            <Icon name="right" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
