import { Link } from 'react-router-dom';
import { MANAGER_PHONE, MANAGER_PHONE_DIGITS } from '../config/contacts';

/* Р-6: /lessons/ and /free-intro/ are gone (301 to /teachers/), so only the contact page shows this block. The page
   prop stays for the old page files that are no longer routed (to be deleted). */
const content = {
  title: 'Запись и поддержка',
  items: [
    ['Запись к репетитору', 'Откройте анкету, выберите предмет, длительность и свободное время и нажмите «Записаться». Репетитор ответит в течение 24 часов, но не позже чем за 2 часа до начала.'],
    ['Отмена и проблемы с занятием', 'Отменить занятие можно в его карточке; раньше чем за 4 часа до начала отмена ни к чему не обязывает. Если занятие не состоялось, нажмите «Сообщить о проблеме» в течение 24 часов после окончания: поддержка разберётся за 3 рабочих дня.'],
    ['Занятия онлайн', 'TopRepet — сервис поиска частных репетиторов. Занятия проходят онлайн по видеосвязи, оплата — напрямую репетитору после подтверждения записи.'],
  ],
};

export function ServiceDetails({ page }: { page: 'lessons' | 'free-intro' | 'contact' }) {
  return <section className="service-details section container" aria-labelledby={`details-${page}`}>
    <h2 id={`details-${page}`}>{content.title}</h2>
    <div className="service-details-grid">{content.items.map(([title, text]) => <div key={title}><h3>{title}</h3><p>{text}</p></div>)}</div>
    <p className="service-details-links">Телефон менеджера: <a href={`tel:+${MANAGER_PHONE_DIGITS}`}>{MANAGER_PHONE}</a>. <Link to="/teachers/">Анкеты репетиторов</Link></p>
  </section>;
}
