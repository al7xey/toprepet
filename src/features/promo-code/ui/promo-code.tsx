export function PromoCode({ value, onChange, applied = false }: { value: string; onChange: (value: string) => void; applied?: boolean }) {
  return (
    <div className={'promo-field' + (applied ? ' is-applied' : '')}>
        <label htmlFor="promo-code">Промокод</label>
          <input
            id="promo-code"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Если есть"
            maxLength={64}
            autoComplete="off"
          />
        {applied && <p className="promo-applied" role="status">Промокод применён — скидка 300 ₽</p>}
    </div>
  );
}
