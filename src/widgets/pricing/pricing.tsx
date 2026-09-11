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
          Любое занятие.
          <br />
          Одна цена.
        </h2>
        <p>Любой предмет, класс и направление.</p>
      </div>
      <div className="price-amount">
        <strong>{PRICE_LABEL}</strong>
        <span>за 60 минут один на один</span>
      </div>
      <div className="price-intro">
        <strong>Сначала познакомимся</strong>
        <p>Короткая встреча с преподавателем — бесплатно.</p>
      </div>
    </section>
  );
}
