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
        <h2 id="price-title">
          Одна цена
          <br />
          на все занятия.
        </h2>
        <p>Любой предмет, домашние задания или подготовка к экзаменам.</p>
      </div>
      <div className="price-offer">
        <div className="price-amount">
          <strong>{PRICE_LABEL}</strong>
          <span>за 60 минут один на один</span>
        </div>
        <p>Первое короткое знакомство — бесплатно.</p>
        <ActionLink>Написать</ActionLink>
      </div>
    </section>
  );
}
