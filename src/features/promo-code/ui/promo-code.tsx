import { useState, type SyntheticEvent } from 'react';
import { MessageCircle } from 'lucide-react';
import { telegramLink } from '../../../shared/config/site';

export function PromoCode() {
  const [promoCode, setPromoCode] = useState('');

  function submitPromo(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = promoCode.trim();
    if (!code) return;
    window.open(
      telegramLink(`Промокод: ${code}`),
      '_blank',
      'noopener,noreferrer',
    );
  }

  return (
    <section
      className="promo-section container"
      aria-labelledby="promo-title"
    >
      <div className="promo-copy">
        <p className="eyebrow">Промокод</p>
        <h2 id="promo-title">Добавьте код в сообщение</h2>
        <p>Мы получим его вместе с заявкой в Telegram.</p>
      </div>
      <form className="promo-form" onSubmit={submitPromo}>
        <label htmlFor="promo-code">Ваш промокод</label>
        <div className="promo-controls">
          <input
            id="promo-code"
            value={promoCode}
            onChange={(event) => setPromoCode(event.target.value)}
            placeholder="Введите код"
            maxLength={64}
            autoComplete="off"
          />
          <button
            className="button button-primary"
            type="submit"
            disabled={!promoCode.trim()}
          >
            <MessageCircle size={19} aria-hidden="true" />
            Отправить
          </button>
        </div>
      </form>
    </section>
  );
}
