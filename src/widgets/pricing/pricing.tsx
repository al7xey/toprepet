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
        <p>При оплате более 10 занятий одним платежом — скидка 10%.</p>
      </div>
      <div className="price-offer">
        <Link className="button button-primary" to="/lessons/">
          Выбрать занятие
        </Link>
      </div>
    </section>
  );
}
