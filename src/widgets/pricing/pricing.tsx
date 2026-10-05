import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
export function Pricing() {
  return (
    <div className="price-layout container">
      <section className="price-section" id="price" aria-labelledby="price-title">
        <div className="price-copy">
          <h2 id="price-title">Любое занятие — <span className="price-title-amount">1 200 ₽</span></h2>
          <ul className="price-benefits">
            <li><Check aria-hidden="true" />60 минут индивидуально с преподавателем</li>
            <li><Check aria-hidden="true" />Одна цена для всех предметов</li>
            <li><Check aria-hidden="true" />Бесплатное знакомство перед первым занятием</li>
          </ul>
        </div>
        <div className="price-offer">
          <Link className="button button-primary" to="/lessons/">Подобрать репетитора</Link>
          <p>Выберите предмет и цель занятий — менеджер поможет подобрать преподавателя.</p>
        </div>
      </section>
      <section className="price-promo" aria-labelledby="price-promo-title">
        <h2 id="price-promo-title">10%</h2>
        <p>Скидка 10% при оплате от 10 занятий одним платежом</p>
      </section>
    </div>
  );
}
