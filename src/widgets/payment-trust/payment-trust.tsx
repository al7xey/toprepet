import { ShieldCheck } from 'lucide-react';

export function PaymentTrust() {
  return (
    <section className="payment-trust" aria-labelledby="payment-trust-title">
      <span className="info-icon"><ShieldCheck aria-hidden="true" /></span>
      <div className="payment-trust-copy">
        <h2 id="payment-trust-title">Гарантия возврата средств</h2>
        <p>100% возврат оплаты, если оплаченное занятие не было проведено.</p>
        <p>TopRepet выступает посредником: деньги выплачиваются репетитору только после проведённого занятия. В спорных ситуациях поддержка поможет разобраться и при наличии оснований оформить возврат.</p>
      </div>
    </section>
  );
}
