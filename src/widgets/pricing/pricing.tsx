import { Link } from 'react-router-dom';
export function Pricing() {
  return (
    <section
      className="price-section container"
      id="price"
      aria-labelledby="price-title"
    >
      <div className="price-copy">
        <h2 id="price-title">1 200 ₽ за любое занятие</h2>
        <p>Индивидуальное занятие длится 60 минут.</p>
      </div>
      <div className="price-offer">
        <p className="price-free"><strong>20 минут бесплатно</strong><br />Знакомство и составление индивидуального плана</p>
        <Link className="button button-primary" to="/lessons">
          Выбрать занятие
        </Link>
      </div>
    </section>
  );
}
