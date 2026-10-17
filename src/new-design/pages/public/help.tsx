import { PublicLayout } from '../../layout/layouts';
import { Button, Faq, Note, PageHeader, Section } from '../../ui';
import { STUDENT_FAQ } from './content';

const MORE_FAQ: [string, string][] = [
  ['Когда списываются деньги?', 'При записи сумма замораживается на карте и списывается, когда репетитор подтвердит урок.'],
  ['Что если репетитор не подтвердит запись?', 'Запись отменится, заморозка снимется, деньги останутся на карте.'],
  ['Как перенести урок?', 'Откройте урок в разделе «Мои уроки», нажмите «Перенести» и выберите другое время. Репетитор подтвердит перенос.'],
];

/** Помощь: ответы на частые вопросы про запись, оплату, отмену и переносы. */
export default function HelpPage() {
  return (
    <PublicLayout tight>
      <PageHeader title="Помощь" lead="Оплата, переносы и возвраты. Здесь ответы на частые вопросы." />
      <Section title="Вопросы и ответы"><Faq items={[...STUDENT_FAQ, ...MORE_FAQ]} /></Section>
      <Note tone="plain" icon="info" action={<Button to="/me/lessons" variant="line" size="s">Мои уроки</Button>}>Вопрос по конкретному уроку? Откройте его в разделе «Мои уроки»: там можно перенести или отменить урок.</Note>
    </PublicLayout>
  );
}
