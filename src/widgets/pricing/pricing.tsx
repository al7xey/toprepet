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
          Один на один.
          <br />
          По одной цене.
        </h2>
        <p>Для всех предметов и направлений.</p>
      </div>
      <div className="price-amount">
        <strong>{PRICE_LABEL}</strong>
        <span>60 минут с преподавателем</span>
      </div>
      <div className="price-intro">
        <strong>Сначала — знакомство</strong>
        <p>
          Короткая бесплатная встреча,
          <br />
          чтобы обсудить занятия.
        </p>
      </div>
    </section>
  );
}
