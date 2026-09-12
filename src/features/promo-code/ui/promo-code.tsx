export function PromoCode({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="promo-field">
        <label htmlFor="promo-code">Промокод</label>
          <input
            id="promo-code"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Если есть"
            maxLength={64}
            autoComplete="off"
          />
    </div>
  );
}
