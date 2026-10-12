import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Page } from '../../ui/layout';
import { Btn, Card, Chip, Dropdown, Empty, MenuItem } from '../../ui/kit';
import { usePhone } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, useSession, requests as rq, catalog } from '../../api';
import { RequestCard } from '../requests/RequestCard';
import { countLabel, now } from '../../lib/time';

/* «Заявки учеников» без входа: репетитор оценивает спрос до регистрации. */
export default function GuestRequests() {
  const d = useDb();
  const me = useSession();
  const phone = usePhone();
  const { askLogin } = useApp();
  const [subject, setSubject] = useState('');
  const [budget, setBudget] = useState<number | null>(null);
  const [menu, setMenu] = useState<'' | 's' | 'b'>('');
  if (me?.role === 'tutor') return <Navigate to="/tutor/requests" replace />;
  const all = d.requests.filter(r => rq.visibleToTutors(r, now())).sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));
  const list = all.filter(r => (!subject || r.subject === subject) && (!budget || (r.budget ?? Infinity) >= budget));
  const subjects = [...new Set(all.map(r => r.subject))];
  const respond = () => askLogin('Войдите как репетитор, чтобы откликнуться', { type: 'go', to: '/tutor/requests' }, 'Откликаться могут репетиторы с анкетой. Нет аккаунта — зарегистрируйтесь как репетитор.');
  const cta = (
    <Card tint style={{ gap: 12 }}>
      <div className="h3">Вы репетитор?</div>
      <p style={{ fontSize: 15 }}>Создайте анкету, чтобы откликаться и принимать оплату на сайте. Ваша цена остаётся вашей — сервисный сбор платит ученик.</p>
      <Btn v="primary" block to="/signup/tutor">Стать топ-репетом</Btn>
    </Card>
  );
  const chips = (
    <div className="r3-chips"><div className="chip-row">
      <span className="filter" data-dd-anchor><Chip set={!!subject} menu onClick={() => setMenu(menu === 's' ? '' : 's')}>{subject ? subject.replace(/ язык$/, '') : 'Предмет'}</Chip></span>
      <span className="filter" data-dd-anchor><Chip set={!!budget} menu onClick={() => setMenu(menu === 'b' ? '' : 'b')}>{budget ? `от ${budget} ₽` : 'Бюджет'}</Chip></span>
    </div>
      <Dropdown open={menu === 's'} onClose={() => setMenu('')} style={{ top: 48 }}>
        <MenuItem checked={!subject} onClick={() => { setSubject(''); setMenu(''); }}>Все предметы</MenuItem>
        {subjects.map(s => <MenuItem key={s} checked={subject === s} onClick={() => { setSubject(s); setMenu(''); }}>{s}</MenuItem>)}
      </Dropdown>
      <Dropdown open={menu === 'b'} onClose={() => setMenu('')} style={{ top: 48 }}>
        <MenuItem checked={!budget} onClick={() => { setBudget(null); setMenu(''); }}>Любой бюджет</MenuItem>
        {catalog.BUDGETS.filter(b => b.value).map(b => <MenuItem key={b.label} checked={budget === b.value} onClick={() => { setBudget(b.value); setMenu(''); }}>{`от ${b.value} ₽ и выше`}</MenuItem>)}
      </Dropdown>
    </div>
  );
  const cards = list.length ? list.map(r => <RequestCard key={r.id} r={r} action={<Btn v="tinted" size="s" onClick={respond}>Откликнуться</Btn>} />) : <Empty icon="doc" title="Заявок по фильтрам нет">Попробуйте другой предмет или бюджет.</Empty>;
  return (
    <Page title="Заявки учеников" phoneTop>
      <div className="title-row">
        <div className="title-block"><h1 className="h1">Заявки учеников</h1><p className="sub">Ученики описали задачу и бюджет. {phone ? 'Откликайтесь своей ценой.' : 'Смотреть можно без входа, откликаться — после регистрации.'}</p></div>
        {!phone && <span className="found">Открыто: <b>{countLabel(all.length, 'заявка', 'заявки', 'заявок')}</b></span>}
      </div>
      {chips}
      {phone ? <>{cards}{cta}</> : (
        <div className="cols c2" style={{ gridTemplateColumns: 'minmax(0,1fr) 320px' }}>
          <div className="stack">{cards}</div>
          <div className="r5-stick">{cta}</div>
        </div>
      )}
    </Page>
  );
}
