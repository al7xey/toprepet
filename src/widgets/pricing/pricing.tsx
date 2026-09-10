import { Check, ArrowUpRight } from 'lucide-react';
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
          <span className="section-kicker">02 / ВСЁ ПРОСТО</span>
          <h2 id="price-title">
            Меняются задачи.
            <br />
            Цена — одна.
          </h2>
          <p>
            Первый класс, сложная тема или экзамен —
            <br className="desktop-break" /> вы заранее знаете стоимость
            встречи.
          </p>
          <div className="price-includes">
            <span>
              <Check size={17} aria-hidden="true" />
              Индивидуальное занятие
            </span>
            <span>
              <Check size={17} aria-hidden="true" />
              60 минут с преподавателем
            </span>
            <span>
              <Check size={17} aria-hidden="true" />
              Любое из направлений
            </span>
          </div>
        </div>
        <div className="price-ticket">
          <div className="ticket-top">
            <span>ОДНО ЗАНЯТИЕ</span>
            <ArrowUpRight size={21} aria-hidden="true" />
          </div>
          <div className="ticket-value">{PRICE_LABEL}</div>
          <p>за 60 минут</p>
          <div className="ticket-divider" />
          <div className="free-row">
            <span>
              Первое короткое
              <br />
              знакомство
            </span>
            <strong>Бесплатно</strong>
          </div>
          <ActionLink>Начать со знакомства</ActionLink>
          <span className="ticket-note">
            Формат и время обсудим в переписке
          </span>
        </div>
      </div>
    </section>
  );
}
