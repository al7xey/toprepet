import { PRICE_LABEL } from '../../shared/config/site';
import { ActionLink } from '../../shared/ui/action-link';
export function Pricing() {
  return (
    <section
      className="price-section container"
      id="price"
      aria-labelledby="price-title"
    >
      <div className="price-copy">
        <h2 id="price-title">Одна цена на любое занятие.</h2>
        <p>Предмет, домашние задания, ОГЭ или ЕГЭ.</p>
      </div>
      <div className="price-offer">
        <div className="price-amount">
          <strong>{PRICE_LABEL}</strong>
          <span>60 минут · индивидуально</span>
        </div>
        <p className="price-free">Первое знакомство — бесплатно</p>
        <ActionLink>Написать</ActionLink>
      </div>
    </section>
  );
}
