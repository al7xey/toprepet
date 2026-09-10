import { ArrowUpRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Direction } from '../model/directions';
import { PRICE_LABEL } from '../../../shared/config/site';
export function DirectionCard({ direction }: { direction: Direction }) {
  return (
    <article className={`direction-card ${direction.color}`}>
      <div className="card-top">
        <span className="card-label">{direction.label}</span>
        <span className="card-symbol" aria-hidden="true">
          {direction.symbol}
        </span>
      </div>
      <h3>{direction.title}</h3>
      <p>{direction.description}</p>
      <ul>
        {direction.points.map((point) => (
          <li key={point}>
            <Check size={15} aria-hidden="true" />
            {point}
          </li>
        ))}
      </ul>
      <div className="card-bottom">
        <div>
          <strong>{PRICE_LABEL}</strong>
          <span>/ 60 минут</span>
        </div>
        <Link
          className="card-open"
          to={`/direction/${direction.id}`}
          aria-label={`Подробнее: ${direction.label}`}
        >
          <ArrowUpRight size={23} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
