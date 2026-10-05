import { useEffect, useState, type SyntheticEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { legalDocuments } from './documents';
import { hasLegalPlaceholders, legalConfig, legalVersion } from '../../shared/config/legal';
import { cookieChoice, saveCookieChoice, COOKIE_CONSENT_EVENT, type CookieChoice } from '../../shared/lib/cookie-consent';
import { PersonalDataCheckbox } from '../../shared/ui/personal-data-checkbox';

const categories = ['Имя в публичной анкете', 'Фотография', 'Образование', 'Профессиональный опыт', 'Предметы', 'Достижения', 'Текстовое описание', 'Иные явно перечисленные данные'];

function PublicationTemplate() {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [expiry, setExpiry] = useState('');
  const [conditions, setConditions] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [allowed, setAllowed] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [notice, setNotice] = useState('');
  function prepare(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consent || !allowed.length) { setNotice('Выберите данные для публикации и подтвердите отдельное согласие на обработку данных формы.'); return; }
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (expiry < todayString) { setNotice('Укажите срок, который ещё не истёк.'); return; }
    const selected = allowed.map(key => `${key}: ${values[key]}`).join('\n');
    const text = [
      'ПРОЕКТ ОТДЕЛЬНОГО СОГЛАСИЯ НА РАСПРОСТРАНЕНИЕ ПЕРСОНАЛЬНЫХ ДАННЫХ',
      `Версия шаблона: ${legalVersion}. Не подписано. Не отправлено.`,
      `Субъект (ФИО): ${name}`, `Контакт субъекта: ${contact}`,
      `Оператор: ${legalConfig.operatorName}; ${legalConfig.operatorType}; ИНН ${legalConfig.inn}; ОГРН/ОГРНИП ${legalConfig.ogrnOrOgrnip}; адрес ${legalConfig.legalAddress}; контакт ${legalConfig.email}.`,
      'Цель: публикация согласованной анкеты для выбора репетитора пользователями.',
      'Ресурс: https://toprepet.ru/ — карточки и страница конкретной анкеты /teachers/. Доступ неопределённому кругу лиц, возможна индексация.',
      'Разрешённые категории и конкретные данные:', selected,
      'Остальные категории не разрешены. Контакты субъекта используются только для оформления согласия и не разрешены к публикации.',
      `Условия / запреты: ${conditions || 'Не указаны — требуется отдельное уточнение; не означает отсутствия ограничений.'}`,
      `Срок: до ${expiry}; прекращение распространения по требованию субъекта в предусмотренном законом порядке.`,
      `Отзыв: ${legalConfig.email}; ${legalConfig.legalAddress}.`,
      'Согласие не разрешает распространение в сторонней рекламе и не объединено с согласием на обычную обработку или рассылки.',
      'Перед использованием заполнить реквизиты оператора, проверить конкретную анкету и оформить надлежащее подтверждение отдельно.',
      'Дата и подтверждение субъекта: ______________________',
    ].join('\n\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'toprepet-public-data-consent-draft.txt'; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('Скачан проект. Он не подписан, не отправлен и сам по себе не разрешает публикацию.');
  }
  return <form className="legal-template ym-hide-content ym-disable-keys" onSubmit={prepare}>
    <label>ФИО репетитора<input required value={name} onChange={event => setName(event.target.value)} autoComplete="name" maxLength={180} /></label>
    <label>Контакт для оформления и отзыва (не публикуется)<input required value={contact} onChange={event => setContact(event.target.value)} maxLength={180} placeholder="Email или телефон" /></label>
    <fieldset><legend>Разрешить публикацию только выбранных данных</legend>{categories.map(category => <div className="legal-public-category" key={category}>
      <label className="legal-category-check"><input type="checkbox" checked={allowed.includes(category)} onChange={event => setAllowed(items => event.target.checked ? [...items, category] : items.filter(item => item !== category))} />{category}</label>
      {allowed.includes(category) && <label>Конкретные сведения / описание файла фотографии<textarea required value={values[category] || ''} onChange={event => setValues(items => ({ ...items, [category]: event.target.value }))} rows={2} maxLength={2000} /></label>}
    </div>)}</fieldset>
    <label>Условия и запреты для каждой категории<textarea required value={conditions} onChange={event => setConditions(event.target.value)} rows={3} maxLength={3000} placeholder="Укажите условия, запреты или явно напишите, что их нет" /></label>
    <label>Срок действия — до даты<input type="date" required value={expiry} onChange={event => setExpiry(event.target.value)} /></label>
    <PersonalDataCheckbox checked={consent} onChange={setConsent} />
    <p>Поля используются только локально для подготовки файла. Не указывайте лишние данные. Скачать проект — не значит дать согласие на распространение.</p>
    <button className="button button-primary" type="submit" disabled={!consent || !allowed.length}>Скачать проект согласия</button>
    <output aria-live="polite">{notice}</output>
  </form>;
}

function CookieSettings() {
  const [choice, setChoice] = useState<CookieChoice | null>(null);
  useEffect(() => {
    const update = () => setChoice(cookieChoice());
    update();
    window.addEventListener(COOKIE_CONSENT_EVENT, update);
    window.addEventListener('storage', update);
    return () => { window.removeEventListener(COOKIE_CONSENT_EVENT, update); window.removeEventListener('storage', update); };
  }, []);
  function choose(value: CookieChoice) { saveCookieChoice(value); setChoice(cookieChoice()); }
  return <div className="legal-cookie-settings"><div className="cookie-banner-actions">
    <button className="button button-primary" onClick={() => choose('all')}>Принять</button>
    <button className="button button-light" onClick={() => choose('necessary')}>Только необходимые</button>
  </div><output aria-live="polite">{choice === 'all' ? 'Аналитика разрешена.' : choice === 'necessary' ? 'Используются только необходимые механизмы.' : ''}</output></div>;
}

export default function LegalPage() {
  const { document: slug } = useParams();
  const document = legalDocuments.find(item => item.slug === slug);
  if (slug && !document) return <section className="not-found container"><p>404</p><h1>Документ не найден</h1><Link className="button button-primary" to="/legal/">К документам</Link></section>;
  return <article className="legal-page container">
    <div className="legal-reading">
      <nav className="legal-breadcrumb" aria-label="Навигация по документам"><Link to="/">Главная</Link><span aria-hidden="true"> / </span>{document ? <Link to="/legal/">Документы</Link> : <span>Документы</span>}</nav>
      <header><h1>{document?.title || 'Документы TopRepet'}</h1><p className="legal-lead">{document?.description || 'Условия использования сервиса, оплаты и сотрудничества, обработка данных и контакты владельца.'}</p><p className="legal-version">Проект редакции от {legalVersion.split('-').reverse().join('.')}</p></header>
      {hasLegalPlaceholders && <aside className="legal-draft-note"><strong>Проект для утверждения владельцем.</strong> Реквизиты и отдельные процессы отмечены TODO. До их заполнения и утверждения текст не является готовой офертой или основанием для получения согласий.</aside>}
      {!document ? <nav className="legal-document-list" aria-label="Все юридические документы">{legalDocuments.map(item => <Link key={item.slug} to={`/legal/${item.slug}/`}><strong>{item.title}</strong><span>{item.description}</span></Link>)}</nav> : <>
        <nav className="legal-toc" aria-label="Оглавление"><h2>Содержание</h2><ol>{document.sections.map(item => <li key={item.id}><a href={`#${item.id}`}>{item.title}</a></li>)}</ol></nav>
        {document.sections.map(item => <section className="legal-section" id={item.id} key={item.id}><h2>{item.title}</h2>{item.content}{document.slug === 'cookies' && item.id === 'choice' && <CookieSettings />}{document.slug === 'tutor-public-data-consent' && item.id === 'template' && <PublicationTemplate />}</section>)}
        <p className="legal-back"><Link to="/legal/">Все документы TopRepet</Link></p>
      </>}
    </div>
  </article>;
}
