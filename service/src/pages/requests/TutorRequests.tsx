import { useState } from 'react';
import { Page } from '../../ui/layout';
import { Alert, Btn, Chip, Dropdown, Empty, MenuItem, St } from '../../ui/kit';
import { usePhone, useNow } from '../../ui/hooks';
import { useDb, useSession, requests as rq, catalog, tutorById } from '../../api';
import { fmtMoney } from '../../lib/money';
import { DAY, NB, countLabel, fmtAgo } from '../../lib/time';
import { RequestCard } from './RequestCard';

type Menu = '' | 'subject' | 'budget' | 'format' | 'time';

export default function TutorRequests() {
  const d = useDb();
  const me = useSession()!;
  const at = useNow();
  const phone = usePhone();
  const t = tutorById(d, me.id);
  const [onlyMatch, setOnlyMatch] = useState(false);
  const [subject, setSubject] = useState(t?.subjects[0]?.subject ?? '');
  const [budget, setBudget] = useState<number | null>(null);
  const [format, setFormat] = useState<'' | 'online' | 'offline'>('');
  const [time, setTime] = useState('');
  const [menu, setMenu] = useState<Menu>('');
  const open = d.requests.filter(r => rq.visibleToTutors(r, at)).sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));
  const responded = new Set(d.responses.filter(x => x.tutorId === me.id).map(x => x.requestId));
  const isMatch = (r: (typeof open)[number]) => !!t && rq.matches(d, t, r);
  const list = open.filter(r => (!onlyMatch || isMatch(r)) && (!subject || r.subject === subject) && (!budget || (r.budget ?? Infinity) >= budget) && (!format || r.format === format) && (!time || r.times.includes(time as never)));
  const matchCount = list.filter(isMatch).length;
  const fresh = open.find(r => isMatch(r) && !responded.has(r.id) && (r.publishedAt ?? 0) > at - DAY);
  const myCount = d.responses.filter(x => x.tutorId === me.id).length;
  const toggle = (m: Menu) => setMenu(menu === m ? '' : m);
  const subjects = [...new Set([...(t?.subjects.map(s => s.subject) ?? []), ...open.map(r => r.subject)])];

  const chips = (
    <div className="r3-chips">
      <div className="chip-row" style={{ flexWrap: phone ? undefined : 'wrap' }}>
        <Chip pressed={onlyMatch} onClick={() => setOnlyMatch(v => !v)}>Подходят мне</Chip>
        <span className="filter" data-dd-anchor><Chip set={!!subject} menu expanded={menu === 'subject'} onClick={() => toggle('subject')}>{subject ? catalog.shortSubject(subject) : 'Предмет'}</Chip></span>
        <span className="filter" data-dd-anchor><Chip set={!!budget} menu expanded={menu === 'budget'} onClick={() => toggle('budget')}>{budget ? `от ${fmtMoney(budget)}` : 'Бюджет'}</Chip></span>
        <span className="filter" data-dd-anchor><Chip set={!!format} menu expanded={menu === 'format'} onClick={() => toggle('format')}>{format === 'online' ? 'Онлайн' : format === 'offline' ? 'Очно' : 'Формат'}</Chip></span>
        <span className="filter" data-dd-anchor><Chip set={!!time} menu expanded={menu === 'time'} onClick={() => toggle('time')}>{catalog.TIME_BUCKETS.find(b => b.id === time)?.label ?? 'Время'}</Chip></span>
      </div>
      <Dropdown open={menu === 'subject'} onClose={() => setMenu('')} style={{ top: 48 }}>
        <MenuItem checked={!subject} onClick={() => { setSubject(''); setMenu(''); }}>Все предметы</MenuItem>
        {subjects.map(s => <MenuItem key={s} checked={subject === s} onClick={() => { setSubject(s); setMenu(''); }}>{s}</MenuItem>)}
      </Dropdown>
      <Dropdown open={menu === 'budget'} onClose={() => setMenu('')} style={{ top: 48 }}>
        <MenuItem checked={!budget} onClick={() => { setBudget(null); setMenu(''); }}>Любой бюджет</MenuItem>
        {catalog.BUDGETS.filter(b => b.value).map(b => <MenuItem key={b.label} checked={budget === b.value} onClick={() => { setBudget(b.value); setMenu(''); }}>{`от ${fmtMoney(b.value!)}`}</MenuItem>)}
      </Dropdown>
      <Dropdown open={menu === 'format'} onClose={() => setMenu('')} style={{ top: 48 }}>
        {([['', 'Любой формат'], ['online', 'Онлайн'], ['offline', 'Очно']] as const).map(([v, l]) => <MenuItem key={v} checked={format === v} onClick={() => { setFormat(v); setMenu(''); }}>{l}</MenuItem>)}
      </Dropdown>
      <Dropdown open={menu === 'time'} onClose={() => setMenu('')} style={{ top: 48 }}>
        <MenuItem checked={!time} onClick={() => { setTime(''); setMenu(''); }}>Любое время</MenuItem>
        {catalog.TIME_BUCKETS.map(b => <MenuItem key={b.id} checked={time === b.id} onClick={() => { setTime(b.id); setMenu(''); }}>{b.label}</MenuItem>)}
      </Dropdown>
    </div>
  );
  const notif = fresh && <Alert tone="action" icon="inbox" title="Новая подходящая заявка" style={{ maxWidth: 'none' }} action={<Btn v="white" size="s" to={`/tutor/requests/${fresh.id}`}>Откликнуться</Btn>}>{`${fresh.title}, ${rq.fmtBudget(fresh.budget)} · пришла ${fmtAgo(fresh.publishedAt ?? fresh.createdAt, at, me.tz)}`}</Alert>;
  const unpublished = !t?.published && <Alert tone="action" icon="user" title="Откликаться можно после публикации анкеты" style={{ maxWidth: 'none' }} action={<Btn v="white" size="s" to="/tutor/profile/publish">Опубликовать</Btn>}>Заявки уже видно — посмотрите, какой спрос по вашим предметам.</Alert>;
  const found = <div className="found">Найдено: <b>{countLabel(list.length, 'заявка', 'заявки', 'заявок').replace(' ', NB)}</b>{t && <> · подходят вам: <b>{matchCount}</b></>}</div>;
  const cards = list.map(r => (
    <RequestCard key={r.id} r={r} match={isMatch(r)} action={responded.has(r.id) ? <St tone="ok" icon="check">Вы откликнулись</St> : <Btn v="tinted" size="s" to={`/tutor/requests/${r.id}`}>Откликнуться</Btn>} />
  ));
  const empty = <Empty icon="doc" title="Заявок по фильтрам нет" style={{ maxWidth: 'none' }} action={<Btn onClick={() => { setOnlyMatch(false); setSubject(''); setBudget(null); setFormat(''); setTime(''); }}>Сбросить фильтры</Btn>}>Новые заявки приходят каждый день, мы пришлём уведомление о подходящих.</Empty>;
  if (phone)
    return (
      <Page title="Заявки учеников" kind="cabinet" tab="Заявки" className="r5">
        <div className="between"><h1 className="h1">Заявки учеников</h1><Btn size="s" to="/tutor/responses">{`Отклики${myCount ? ` · ${myCount}` : ''}`}</Btn></div>
        {unpublished}{notif}{chips}{found}
        {cards.length ? cards : empty}
      </Page>
    );
  return (
    <Page title="Заявки учеников" kind="cabinet" side="Заявки" className="r5">
      <div className="r5-head">
        <div className="title-block"><h1 className="h1">Заявки учеников</h1><p className="sub">Откликайтесь своей ценой и окнами. Чат с учеником откроется после отклика.</p></div>
        <Btn size="m" to="/tutor/responses">{`Мои отклики${myCount ? ` · ${myCount}` : ''}`}</Btn>
      </div>
      {unpublished}{notif}{chips}{found}
      {cards.length ? <div className="cols half">{cards}</div> : empty}
    </Page>
  );
}
