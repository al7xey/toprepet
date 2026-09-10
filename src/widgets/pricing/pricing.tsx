import { PRICE_LABEL } from '../../shared/config/site';
import { ActionLink } from '../../shared/ui/action-link';
export function Pricing() {
  return (
    <section
      className="section container"
      id="price"
      aria-labelledby="price-title"
    >
      <div className="price-panel">
        <div className="price-copy">
          <h2 id="price-title">
            Одна цена.
            <br />
            Для всех направлений.
          </h2>
          <p>Индивидуально с преподавателем.</p>
        </div>
        <div className="price-ticket">
          <div className="ticket-value">{PRICE_LABEL}</div>
          <p>за 60 минут</p>
          <div className="free-row">
            <span>
              Первое короткое
              <br />
              знакомство
            </span>
            <strong>Бесплатно</strong>
          </div>
          <ActionLink>Начать со знакомства</ActionLink>
        </div>
      </div>
    </section>
  );
}
