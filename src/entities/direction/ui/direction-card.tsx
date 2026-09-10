import { Link } from 'react-router-dom';
import type { Direction } from '../model/directions';
import { PRICE_LABEL } from '../../../shared/config/site';
export function DirectionCard({ direction }: { direction: Direction }) {
  return (
    <article className={`direction-card ${direction.color}`}>
      <h3>{direction.label}</h3>
      <p>{direction.description}</p>
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
          Подробнее
        </Link>
      </div>
    </article>
  );
}
