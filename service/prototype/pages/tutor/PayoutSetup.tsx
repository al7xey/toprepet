import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionBar, Page } from '../../ui/layout';
import { Alert, Btn, Note, Options, St, TextField, Timeline } from '../../ui/kit';
import { Icon } from '../../ui/icons';
import { usePhone } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, useSession, tutors as tApi, tutorById } from '../../api';
import type { Payout } from '../../api/types';
import { fmtMoney, studentPrice } from '../../lib/money';

export default function PayoutSetup() {
  const d = useDb();
  const me = useSession()!;
  const phone = usePhone();
  const navigate = useNavigate();
  const { run, toast } = useApp();
  const t = tutorById(d, me.id);
  const p = t?.payout;
  const [status, setStatus] = useState<Payout['status']>(p?.status ?? 'self');
  const [inn, setInn] = useState(p?.inn ?? '');
  const [card, setCard] = useState(p?.card ?? '');
  const [partner, setPartner] = useState(p?.partner ?? false);
  const [tried, setTried] = useState(false);
  const price = t?.prices.find(x => x.minutes === 60)?.price ?? t?.prices[0]?.price ?? 2000;
  const innDigits = inn.replace(/\D/g, '');
  const cardDigits = card.replace(/\D/g, '');
  const cardKept = !!p && card === p.card;
  const errInn = tried && !/^\d{10}(\d{2})?$/.test(innDigits) ? 'ИНН — 12 цифр для самозанятого или 10–12 для ИП' : undefined;
  const errCard = tried && !cardKept && cardDigits.length < 16 ? 'Введите номер карты полностью' : undefined;
  const save = () => {
    setTried(true);
    if (status === 'none') return toast('Выплаты возможны только самозанятым и ИП', { tone: 'bad' });
    if (!/^\d{10}(\d{2})?$/.test(innDigits) || (!cardKept && cardDigits.length < 16)) return;
    const ok = run(() => { tApi.savePayout({ status, inn: innDigits, card: cardKept ? `${p!.card.slice(0, 4)}00000000${p!.card.slice(-4)}` : cardDigits, partner }); return true; });
    if (ok) { toast('Реквизиты сохранены', { tone: 'ok' }); navigate('/tutor/finance'); }
  };
  const fmtCard = (v: string) => v.replace(/[^\d•]/g, '').replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
  const form = (wide: boolean) => (
    <>
      <Options className="r8-col" legend={<span className="h3" style={{ display: 'block', marginBottom: 10 }}>Ваш статус</span>} options={[{ value: 'self', label: 'Самозанятый', small: 'налог 4 %' }, { value: 'ip', label: 'ИП' }, { value: 'none', label: 'Пока нет статуса' }]} value={status} onChange={v => setStatus(v as Payout['status'])} />
      {status === 'none' ? (
        <Alert tone="action" icon="info" title="Без статуса выплаты не придут" style={{ maxWidth: 'none' }} action={<a className="btn btn--white btn--s" href="https://npd.nalog.ru/app/" target="_blank" rel="noreferrer">Как это сделать</a>}>Стать самозанятым можно за 10 минут в приложении «Мой налог».</Alert>
      ) : (
        <>
          <div className={wide ? 'cols half' : 'cols'} style={{ alignItems: 'start' }}>
            <TextField label="ИНН" value={inn} onChange={v => setInn(v.replace(/[^\d ]/g, '').slice(0, 14))} inputMode="numeric" error={errInn} placeholder={status === 'ip' ? '10 или 12 цифр' : '12 цифр'} style={{ maxWidth: 'none' }} />
            <TextField label="Карта для выплат" value={card} onChange={v => setCard(fmtCard(v))} inputMode="numeric" error={errCard} placeholder="2202 0000 0000 0000" help={cardKept ? 'Чтобы сменить карту, введите новый номер' : 'Карта на ваше имя, любой банк РФ'} style={{ maxWidth: 'none' }} />
          </div>
          {status === 'self' && (
            <div className="card tint">
              <div className="r8-partner">
                <span className="r8-ic"><Icon name="check" /></span>
                <div><b>TopRepet в «Моём налоге»</b><span>Подключите партнёром — чеки за уроки сформируем сами</span>{partner ? <St tone="ok" icon="check">Подключено</St> : <Btn v="white" size="s" onClick={() => setPartner(true)}>Подключить</Btn>}</div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
  const how = (
    <div className="card"><div className="h3">Как приходят деньги</div>
      <Timeline flat items={[
        { state: 'done', title: 'Урок прошёл', text: 'Ученик подтвердил или прошло 24 ч' },
        { state: 'cur', icon: 'wallet', title: `Переводим ${fmtMoney(price)}`, text: `${p ? `На карту •• ${p.card.slice(-4)}, ` : ''}за каждый урок отдельно` },
        { state: 'todo', title: 'Чек в «Моём налоге»', text: 'Формируем автоматически' },
      ]} />
      <Note>{`Ученик платит ${fmtMoney(studentPrice(price))}: ваша цена и 10 % сервиса сверху. Вы получаете ${fmtMoney(price)}.`}</Note>
    </div>
  );
  if (phone)
    return (
      <Page title="Выплаты" back="/tutor/finance" bottom={<ActionBar><Btn v="primary" size="m" onClick={save} disabled={status === 'none'}>Сохранить</Btn></ActionBar>}>
        <div style={{ display: 'grid', gap: 6 }}><h1 className="h2">Куда переводить деньги</h1><p className="sub">Каждый урок переводим отдельно, сразу после подтверждения ученика</p></div>
        {form(false)}
      </Page>
    );
  return (
    <Page title="Выплаты" kind="cabinet" side="Финансы">
      <div className="title-block"><h1 className="h1">Куда переводить деньги</h1><p className="sub">Заполните один раз перед первой выплатой</p></div>
      <div className="cols c2">
        <div className="card" style={{ gap: 18, padding: 24 }}>{form(true)}<div><Btn v="primary" size="m" onClick={save} disabled={status === 'none'}>Сохранить</Btn></div></div>
        {how}
      </div>
    </Page>
  );
}
