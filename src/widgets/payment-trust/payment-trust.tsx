export function PaymentTrust() {
  return (
    <section className="section container payment-trust" aria-labelledby="payment-trust-title">
      <div className="payment-trust-panel">
        <img className="payment-trust-art" src="/images/payment-trust.webp" alt="Человек спокойно читает книгу, облокотившись на большой замок" width="1536" height="1024" loading="lazy" />
        <div className="payment-trust-copy">
          <h2 id="payment-trust-title">100% гарантия возврата средств</h2>
          <p>Гарантируем полный возврат оплаты, если возникнет спорная ситуация и услуга не будет оказана надлежащим образом.</p>
          <p>TopRepet выступает посредником между вами и репетитором: деньги не перечисляются преподавателю сразу, а начисляются только после проведённого занятия. Если возникнет проблема, поддержка поможет разобраться в ситуации и при необходимости оформить возврат.</p>
        </div>
      </div>
    </section>
  );
}
