import type { ReactNode } from 'react';

import { Icon, type IconName } from './icon';

/* Card with a round tinted icon, a title, a short text and an optional action. `wide` puts the action on the right (desktop). */
export function InfoCard({ icon, title, text, action, wide }: { icon: IconName; title: string; text: string; action?: ReactNode; wide?: boolean }) {
  return (
    <div className={`tr-card tr-info${wide ? ' tr-info--wide' : ''}`}>
      <span className="tr-ic"><Icon name={icon} /></span>
      <div>
        <h3 className="tr-h3">{title}</h3>
        <span className="tr-small">{text}</span>
        {!wide && action}
      </div>
      {wide && action}
    </div>
  );
}

export function StepCards({ steps }: { steps: readonly (readonly [string, string])[] }) {
  return (
    <ol className="tr-steps" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {steps.map(([title, text], index) => (
        <li className="tr-step" key={title}>
          <i>{index + 1}</i>
          <b>{title}</b>
          <span>{text}</span>
        </li>
      ))}
    </ol>
  );
}
