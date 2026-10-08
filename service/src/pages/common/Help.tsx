import { useState } from 'react';
import { Page } from '../../ui/layout';
import { Btn, Chip, Empty } from '../../ui/kit';
import { Icon } from '../../ui/icons';
import { usePhone } from '../../ui/hooks';
import { useSession } from '../../api';
import { nb } from '../../lib/text';

type Topic = 'Оплата' | 'Отмена' | 'Уроки' | 'Выплаты' | 'Безопасность';
const FAQ: { topic: Topic; q: string; a: string }[] = [
  { topic: 'Оплата', q: 'Когда списываются деньги за урок?', a: 'При записи сумму замораживаем на карте. Списываем, когда репетитор подтвердит урок. Для серии уроков — за 24 часа до каждого занятия.' },
  { topic: 'Оплата', q: 'Что такое заморозка?', a: 'Банк временно блокирует сумму на карте, но не списывает её. Если репетитор не подтвердит запись за 24 часа, заморозка снимется сама, обычно банк возвращает доступ к деньгам за 1–3 дня.' },
  { topic: 'Оплата', q: 'Почему цена выше, чем указал репетитор?', a: 'Ученик платит цену репетитора и 10 % сервиса TopRepet. Репетитор получает ровно свою цену, комиссию с него мы не берём.' },
  { topic: 'Оплата', q: 'Можно ли платить по промокоду?', a: 'Да, промокод вводится на шаге оплаты. Скидку оплачивает TopRepet, репетитор получает полную цену.' },
  { topic: 'Отмена', q: 'Как вернуть деньги за отменённый урок?', a: 'Отмените урок не позже чем за 4 часа до начала — деньги вернутся полностью. Если отменил репетитор, возврат полный в любой момент.' },
  { topic: 'Отмена', q: 'Куда приходит возврат?', a: 'На ту карту или счёт, с которых платили. Обычно за 1–5 рабочих дней, срок зависит от банка.' },
  { topic: 'Отмена', q: 'Можно перенести урок?', a: 'Да, до 4 часов до начала. Выберите новое время из свободных окон репетитора, оплата перейдёт на новое время. Если репетитор не согласится, урок останется в старое время.' },
  { topic: 'Уроки', q: 'Урок прошёл плохо. Что делать?', a: 'В течение 24 часов после урока нажмите «Сообщить о проблеме» в карточке урока. Деньги заморозим, поддержка выслушает обе стороны и решит за 3 рабочих дня.' },
  { topic: 'Уроки', q: 'Репетитор не пришёл на урок', a: 'Через 15 минут после начала в карточке урока появится кнопка «Репетитор не пришёл». Обычно в таком случае возвращаем деньги полностью.' },
  { topic: 'Уроки', q: 'Что такое бесплатное знакомство?', a: 'Короткая встреча 15–30 минут, чтобы обсудить цель и формат. Одно на каждого репетитора, без оплаты.' },
  { topic: 'Выплаты', q: 'Когда репетитор получает деньги?', a: 'Каждый урок переводим отдельно: сразу после подтверждения ученика или через 24 часа после конца урока. Если открыт спор — после решения поддержки.' },
  { topic: 'Выплаты', q: 'Кому доступны выплаты?', a: 'Самозанятым и ИП. Самозанятые могут подключить TopRepet партнёром в «Моём налоге» — чеки сформируем сами.' },
  { topic: 'Безопасность', q: 'Почему в чате скрываются телефоны?', a: 'Пока вы общаетесь и платите в TopRepet, у вас есть возврат денег за отменённые уроки, защита в споре и история занятий. Вне сайта мы не сможем помочь.' },
  { topic: 'Безопасность', q: 'Как пожаловаться на собеседника?', a: 'В чате нажмите «…» и выберите «Пожаловаться». Можно сразу заблокировать человека, переписка сохранится. Поддержка проверит её за 24 часа.' },
];
const TOPICS: Topic[] = ['Оплата', 'Отмена', 'Уроки', 'Выплаты', 'Безопасность'];

export default function Help() {
  const me = useSession();
  const phone = usePhone();
  const [q, setQ] = useState('');
  const [topic, setTopic] = useState<Topic | ''>(me?.role === 'tutor' ? 'Выплаты' : 'Оплата');
  const [open, setOpen] = useState<string>(FAQ.find(f => f.topic === (me?.role === 'tutor' ? 'Выплаты' : 'Оплата'))!.q);
  const s = q.trim().toLowerCase();
  const list = FAQ.filter(f => (s ? `${f.q} ${f.a}`.toLowerCase().includes(s) : !topic || f.topic === topic));
  const search = <label className="search" style={{ maxWidth: 'none', background: '#fff', boxShadow: '0 0 0 .5px var(--sep)' }}><Icon name="search" /><input placeholder="Поиск по вопросам" value={q} onChange={e => setQ(e.target.value)} aria-label="Поиск по вопросам" /></label>;
  const chips = !s && <div className="chip-row" style={{ display: 'flex', gap: 8, flexWrap: phone ? 'nowrap' : 'wrap', overflowX: 'auto' }}>{TOPICS.map(x => <Chip key={x} pressed={topic === x} onClick={() => setTopic(topic === x ? '' : x)}>{x}</Chip>)}</div>;
  const box = list.length ? (
    <div className="r8-qbox">
      {list.map(f => {
        const on = open === f.q || !!s;
        return (
          <div className="r8-q" key={f.q}>
            <button type="button" className="between" aria-expanded={on} onClick={() => setOpen(on && !s ? '' : f.q)} style={{ border: 0, background: 'none', padding: 0, font: 'inherit', textAlign: 'left', cursor: 'pointer', color: 'inherit' }}><b>{f.q}</b><Icon name={on ? 'down' : 'right'} /></button>
            {on && <p>{nb(f.a)}</p>}
          </div>
        );
      })}
    </div>
  ) : <Empty icon="help" title="Ничего не нашли" style={{ maxWidth: 'none' }}>Попробуйте другие слова или напишите в поддержку.</Empty>;
  const support = (big: boolean) => (
    <div className="card" style={{ gap: big ? 12 : 10 }}>
      {big && <span className="r8-sup"><Icon name="chat" /></span>}
      <span className="h3">Не нашли ответ?</span>
      <span className={big ? 'sub' : 'small'} style={big ? { fontSize: 14 } : undefined}>{big ? 'Напишите в чат поддержки. Если вопрос про урок, откройте чат из карточки урока, так мы сразу увидим, о чём речь.' : 'Поддержка отвечает в чате, обычно за 10 минут'}</span>
      <Btn v="tinted" size="m" block to="/support">Написать в поддержку</Btn>
    </div>
  );
  if (phone)
    return (
      <Page title="Помощь" back={me ? (me.role === 'tutor' ? '/tutor/profile' : '/account') : '/'}>
        {search}{chips}{box}{support(false)}
      </Page>
    );
  return (
    <Page title="Помощь" kind={me ? 'cabinet' : 'site'} side="Помощь">
      <div className="title-block"><h1 className="h1">Помощь</h1><p className="sub">Ответы на частые вопросы про оплату, отмены и выплаты</p></div>
      <div className="cols c2">
        <div style={{ display: 'grid', gap: 14 }}>{search}{chips}{box}</div>
        {support(true)}
      </div>
    </Page>
  );
}
