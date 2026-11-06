import { PublicLayout } from '../../layout/layouts';
import { Faq, PageHeader, Section } from '../../ui';
import { STUDENT_FAQ } from './content';

const MORE_FAQ: [string, string][] = [
  ['Когда списываются деньги?', 'При записи сумма замораживается на карте и списывается, когда репетитор подтвердит урок.'],
  ['Что если репетитор не подтвердит запись?', 'Запись отменится, заморозка снимется, деньги останутся на карте.'],
  ['Как перенести урок?', 'Откройте урок в разделе «Мои уроки», нажмите «Перенести» и выберите другое время. Репетитор подтвердит перенос.'],
];
const FAQ = [...STUDENT_FAQ, ...MORE_FAQ];
const FAQ_SCHEMA = {
  '@context': 'https://schema.org', '@type': 'FAQPage', '@id': 'https://toprepet.ru/help/#faq',
  mainEntity: FAQ.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })),
};

/** Помощь: ответы на частые вопросы про запись, оплату, отмену и переносы. */
export default function HelpPage() {
  return (
    <PublicLayout tight>
      <PageHeader title="Помощь" />
      <script type="application/ld+json">{JSON.stringify(FAQ_SCHEMA).replace(/</g, '\\u003c')}</script>
      <Section title="Вопросы и ответы"><Faq items={FAQ} /></Section>
    </PublicLayout>
  );
}
