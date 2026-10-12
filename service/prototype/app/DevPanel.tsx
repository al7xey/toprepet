import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../ui/icons';
import { Btn } from '../ui/kit';
import { useNow } from '../ui/hooks';
import { useApp } from '../ui/app-state';
import { auth, getDb, resetDb, useSession, DEMO_ACCOUNTS } from '../api';
import { homeFor } from '../pages/auth/shared';
import { DAY, HOUR, MIN, fmtDayTime, setTimeOffset, timeOffset, MSK } from '../lib/time';

/* Demo tools: switch accounts, move the clock to see timed rules (24 h confirmation, reminders, charges) and reset data.
   Hidden in production builds unless VITE_DEMO=1. */
export function DevPanel() {
  const enabled = import.meta.env.DEV || import.meta.env.VITE_DEMO === '1';
  const [open, setOpen] = useState(false);
  const me = useSession();
  const navigate = useNavigate();
  const { toast } = useApp();
  const t = useNow(1000);
  if (!enabled) return null;
  const shift = (ms: number) => {
    setTimeOffset(timeOffset() + ms);
    toast(`Время: ${fmtDayTime(Date.now() + timeOffset(), MSK)} МСК`, { tone: 'ok' });
  };
  const loginAs = (email: string) => {
    const u = getDb().users.find(x => x.email === email);
    if (!u) return;
    auth.loginAs(u.id);
    setOpen(false);
    navigate(homeFor(u));
  };
  return (
    <>
      <button className="dev-fab" type="button" aria-label="Демо-панель" aria-expanded={open} onClick={() => setOpen(o => !o)}><Icon name="spark" /></button>
      {open && (
        <div className="dev-panel" role="dialog" aria-label="Демо-панель">
          <div className="between"><h4>Демо-панель</h4><button className="close" type="button" aria-label="Закрыть" onClick={() => setOpen(false)}><Icon name="x" /></button></div>
          <div className="stack-s">
            <span className="small">Войти как</span>
            {DEMO_ACCOUNTS.map(a => <Btn key={a.email} size="s" v={me?.email === a.email ? 'tinted' : 'gray'} block onClick={() => loginAs(a.email)}>{a.label}</Btn>)}
            {me && <Btn size="s" block onClick={() => { auth.logout(); setOpen(false); navigate('/'); }}>Выйти (гость)</Btn>}
          </div>
          <div className="stack-s">
            <span className="small">Время сервиса: <b className="ink">{fmtDayTime(t, MSK)} МСК</b>{timeOffset() ? ' (сдвинуто)' : ''}</span>
            <div className="row-s">
              <Btn size="s" onClick={() => shift(15 * MIN)}>+15 мин</Btn>
              <Btn size="s" onClick={() => shift(HOUR)}>+1 ч</Btn>
              <Btn size="s" onClick={() => shift(4 * HOUR)}>+4 ч</Btn>
              <Btn size="s" onClick={() => shift(DAY)}>+1 день</Btn>
              <Btn size="s" onClick={() => { setTimeOffset(0); toast('Время сброшено', { tone: 'ok' }); }}>Сейчас</Btn>
            </div>
          </div>
          <div className="stack-s">
            <span className="small">Тестовые карты: <code>2200 0000 0000 0004</code> успешно, номер на <code>…0002</code> — отказ банка, на <code>…0341</code> — не пройдут списания серии. Карта выплат на <code>…0000</code> — закрыта.</span>
            <div className="row-s">
              <Btn size="s" icon="mail" onClick={() => { setOpen(false); navigate('/mail'); }}>Письма</Btn>
              <Btn size="s" v="danger" onClick={() => { if (confirm('Сбросить все данные к демо-набору?')) { resetDb(); setTimeOffset(0); auth.logout(); navigate('/'); toast('Данные сброшены', { tone: 'ok' }); } }}>Сбросить данные</Btn>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
