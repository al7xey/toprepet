import { ArrowRight } from 'lucide-react';

type PromoStatus = 'idle' | 'applied' | 'not-found';

export function PromoCode({ value, onChange, onApply, status = 'idle' }: { value: string; onChange: (value: string) => void; onApply: () => void; status?: PromoStatus }) {
  return (
    <form className="promo-field" onSubmit={(event) => { event.preventDefault(); onApply(); }}>
        <label htmlFor="promo-code">Промокод</label>
        <div className="promo-input-row">
          <input className="ym-disable-keys"
            id="promo-code"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Если есть"
            maxLength={64}
            autoComplete="off"
          />
          <button type="submit" className="promo-apply" aria-label="Применить промокод">
            <ArrowRight size={20} aria-hidden="true" />
          </button>
        </div>
        {status === 'applied' && <output className="promo-status is-applied">Промокод применён</output>}
        {status === 'not-found' && <output className="promo-status is-not-found">Промокод не найден</output>}
    </form>
  );
}
