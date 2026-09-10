import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../../shared/ui/accordion';
const questions = [
  [
    'Как начать занятия?',
    'Выберите предмет или напишите нам в Telegram. На бесплатном коротком знакомстве обсудите с преподавателем задачу, формат и время занятий.',
  ],
  [
    'Можно заниматься только по домашним заданиям?',
    'Да. Выберите «Домашние задания» и нужный предмет. Преподаватель занимается вместе с ребёнком по его школьным заданиям.',
  ],
  [
    'Кто будет заниматься с ребёнком?',
    'Частный репетитор. Анкеты пока готовятся; сведения об опыте преподавателя и доступном формате занятий уточните в переписке.',
  ],
  [
    'Как оплачивать и переносить занятия?',
    'Все занятия стоят 1 200 ₽ за 60 минут. Порядок оплаты, отмены и переноса согласуйте с преподавателем до первого платного занятия.',
  ],
];
export default function Faq() {
  return (
    <section
      className="faq-section section container"
      id="faq"
      aria-labelledby="faq-title"
    >
      <h2 id="faq-title">
        Перед первым
        <br />
        занятием
      </h2>
      <Accordion className="faq-list">
        {questions.map(([q, a], i) => (
          <AccordionItem key={q} value={String(i)} className="faq-item">
            <AccordionTrigger className="faq-trigger">{q}</AccordionTrigger>
            <AccordionContent className="faq-answer">
              <p>{a}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
