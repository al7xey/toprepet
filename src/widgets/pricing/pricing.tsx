import { PRICE_LABEL } from '../../shared/config/site';
export function Pricing() {
  return (
    <section
      className="price-section container"
      id="price"
      aria-labelledby="price-title"
    >
      <div>
        <h2 id="price-title">
          Одна цена
          <br />
          на все занятия.
        </h2>
        <p>Для любого предмета и класса.</p>
      </div>
      <div className="price-amount">
        <strong>{PRICE_LABEL}</strong>
        <span>за 60 минут один на один</span>
      </div>
      <div className="price-intro">
        <strong>Знакомство — бесплатно</strong>
        <p>Обсудите с преподавателем цель и удобное время занятий.</p>
      </div>
    </section>
  );
}
