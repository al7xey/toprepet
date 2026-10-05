import { Link } from 'react-router-dom';

export function PaymentTrust() {
  return (
    <section className="section container payment-trust" aria-labelledby="payment-trust-title">
      <div className="payment-trust-panel">
        <img className="payment-trust-art" src="/images/payment-trust.webp" alt="Человек спокойно читает книгу, облокотившись на большой замок" width="1536" height="1024" loading="lazy" />
        <div className="payment-trust-copy">
          <h2 id="payment-trust-title">100% гарантия возврата средств</h2>
          <p>100% возврат оплаты, если оплаченное занятие не было проведено.</p>
          <p>TopRepet выступает посредником между вами и репетитором: деньги не перечисляются преподавателю сразу, а выплачиваются только после проведённого занятия. В других спорных ситуациях поддержка поможет разобраться и при наличии оснований оформить возврат.</p>
          <Link className="inline-link" to="/legal/payment-refund/">Оплата, переносы и возвраты</Link>
        </div>
      </div>
    </section>
  );
}
