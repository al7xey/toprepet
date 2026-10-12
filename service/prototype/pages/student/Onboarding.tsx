import { useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ActionBar, Page } from '../../ui/layout';
import { Btn, IBtn, Note, Options, StepsBar, TextField, Ph } from '../../ui/kit';
import { Icon } from '../../ui/icons';
import { usePhone } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useSession, catalog, students } from '../../api';
import type { Tone } from '../../api/types';
import { nb } from '../../lib/text';

const STEPS = ['for-whom', 'subject', 'how'] as const;

export default function Onboarding() {
  const { step = 'for-whom' } = useParams();
  const [sp] = useSearchParams();
  const me = useSession()!;
  const phone = usePhone();
  const navigate = useNavigate();
  const { run } = useApp();
  const ob = me.onboarding ?? { step: 0, done: false, forWhom: 'self' as const };
  const n = STEPS.indexOf(step as (typeof STEPS)[number]) + 1;
  const [who, setWho] = useState<'self' | 'other'>(ob.forWhom);
  const [childName, setChildName] = useState(me.children[0]?.name ?? '');
  const [childAge, setChildAge] = useState(me.children[0]?.age ?? '');
  const [dir, setDir] = useState(catalog.DIRECTIONS.find(x => x.title === ob.goal || x.id === ob.goal)?.title ?? '');
  const [subject, setSubject] = useState(ob.subject ?? '');
  const [tried, setTried] = useState(false);
  if (!n) return <Navigate to="/start/for-whom" replace />;
  const then = sp.get('then');
  const q = then ? `?then=${encodeURIComponent(then)}` : '';
  const skip = () => { run(() => students.saveOnboarding({ step: Math.max(ob.step, n - 1) as 0 | 1 | 2 | 3 })); navigate(then ?? '/account'); };
  const back = n > 1 ? () => navigate(`/start/${STEPS[n - 2]}${q}`) : undefined;
  const direction = catalog.DIRECTIONS.find(x => x.title === dir);
  const subjects = direction?.subjects ?? [];
  const subjShort = subject ? catalog.shortSubject(subject) : '';

  const next1 = () => {
    setTried(true);
    if (who === 'other' && (!childName.trim() || !childAge.trim())) return;
    const ok = run(() => {
      if (who === 'other' && !me.children.some(c => c.name === childName.trim())) students.addChild(childName, childAge);
      students.saveOnboarding({ forWhom: who, step: Math.max(ob.step, 1) as 1 | 2 | 3 });
      return true;
    });
    if (ok) navigate(`/start/subject${q}`);
  };
  const next2 = () => {
    setTried(true);
    if (!dir || !subject) return;
    if (run(() => { students.saveOnboarding({ goal: dir, subject, step: Math.max(ob.step, 2) as 2 | 3 }); return true; })) { setTried(false); navigate(`/start/how${q}`); }
  };
  const finish = (to: string) => { run(() => students.saveOnboarding({ step: 3, done: true })); navigate(then ?? to); };

  const body1 = (
    <>
      <div style={{ display: 'grid', gap: 8 }}><h1 className="h2">Для кого подбираем занятия?</h1><p className="sub">Так покажем подходящих репетиторов.</p></div>
      <div className="r1-pick">
        <div className="list" role="radiogroup" aria-label="Для кого">
          {([['self', 'Для себя', ''], ['other', 'Для другого человека', 'Например, для сына или дочери. Записывать будете вы.']] as const).map(([v, title, text]) => (
            <label key={v} className="li"><input type="radio" name="who" checked={who === v} onChange={() => setWho(v)} /><span className="t"><b>{title}</b>{text && <span>{text}</span>}</span><span className="mark" aria-hidden="true"><Icon name="check" /></span></label>
          ))}
        </div>
      </div>
      {who === 'other' && (
        <>
          <div className="cols half" style={{ gap: 12 }}>
            <TextField label="Имя" value={childName} onChange={setChildName} placeholder="Миша" error={tried && !childName.trim() ? 'Укажите имя' : undefined} />
            <TextField label="Возраст или класс" value={childAge} onChange={setChildAge} placeholder="14 лет, 8 класс" error={tried && !childAge.trim() ? 'Укажите возраст или класс' : undefined} />
          </div>
          <Note tone="action" icon="eye">Имя и возраст увидит репетитор в записи на урок.</Note>
          <Note className="r1-plain">{nb('Подростку можно зарегистрироваться и самому, тогда он выбирает «Для себя».')}</Note>
        </>
      )}
    </>
  );
  const opts2 = (
    <>
      <Options className="r1-ob" legend="Какая помощь нужна?" options={catalog.DIRECTIONS.map(x => x.title)} value={dir} onChange={v => { setDir(v); if (!catalog.DIRECTIONS.find(x => x.title === v)?.subjects.includes(subject)) setSubject(''); }} error={tried && !dir ? 'Выберите направление' : undefined} />
      {dir && <Options className="r1-ob" legend="Предмет" options={subjects} value={subject} onChange={setSubject} error={tried && !subject ? 'Выберите предмет' : undefined} />}
    </>
  );
  const whoLabel = who === 'self' ? 'Для себя' : `${childName || 'Ребёнок'}${childAge ? `, ${childAge}` : ''}`;
  const choice = (to: string, tone: Tone, title: string, text: string, big: boolean) => (
    <a className={`r1-choice${big ? ' r1-big' : ''}`} href={to} onClick={e => { e.preventDefault(); finish(to); }}>
      <Ph tone={tone} />
      <span className="t"><b>{title}</b><span>{nb(text)}</span></span>
      {big ? <span className="btn btn--s btn--gray r1-go">Выбрать</span> : <Icon name="right" />}
    </a>
  );
  const catalogTo = `/teachers?${new URLSearchParams({ ...(subject ? { subject } : {}), ...(direction ? { dir: direction.id } : {}) })}`;
  const requestTo = `/requests/new?${new URLSearchParams({ ...(subject ? { subject } : {}), ...(direction ? { dir: direction.id } : {}) })}`;
  const body3 = (big: boolean) => (
    <>
      <div style={{ display: 'grid', gap: 8 }}><h1 className={big ? 'h1' : 'h2'}>{subjShort ? `Как будем искать преподавателя по предмету «${subjShort.toLowerCase()}»?` : 'Как будем искать преподавателя?'}</h1><p className="sub">Можно попробовать оба способа, заявка не мешает записаться самому.</p></div>
      <div className={`cols${big ? ' half' : ''}`} style={{ gap: 12 }}>
        {choice(catalogTo, 'indigo', 'Выбрать самому', 'Каталог с анкетами, отзывами и свободным временем. Записаться можно сразу.', big)}
        {choice(requestTo, 'sand', 'Создать заявку', 'Опишите задачу и бюджет, подходящие репетиторы напишут вам сами.', big)}
      </div>
    </>
  );
  const skipBtn = <Btn size="s" onClick={skip}>Пропустить</Btn>;

  if (phone) {
    const top = (
      <div className="r1-topbar" style={{ paddingTop: 'max(14px, env(safe-area-inset-top))' }}>
        {back && <IBtn icon="left" label="Назад" onClick={back} />}
        <StepsBar n={n} of={3} />
        <span className="r1-step">{`${n} из 3`}</span>
        {skipBtn}
      </div>
    );
    const bar = n === 1 ? <ActionBar><Btn v="primary" onClick={next1}>Дальше</Btn></ActionBar> : n === 2 ? <ActionBar><Btn style={{ flex: '0 0 auto' }} onClick={back}>Назад</Btn><Btn v="primary" onClick={next2}>Дальше</Btn></ActionBar> : undefined;
    return (
      <Page title="Настройка" kind="bare" hideTabs bottom={bar}>
        {top}
        <div style={{ display: 'grid', gap: n === 2 ? 22 : 14 }}>
          {n === 1 && body1}
          {n === 2 && <><h1 className="h2">Чему хотите научиться?</h1>{opts2}<div className="card" style={{ gap: 4 }}><span className="small">Ваши занятия</span><b>{subjShort ? `${subjShort}${dir ? `, ${dir.toLowerCase()}` : ''}` : dir || 'Пока не выбрано'}</b><span className="small" style={{ color: 'var(--ink)' }}>{whoLabel}</span></div></>}
          {n === 3 && <>{body3(false)}<Btn block onClick={() => finish('/account')}>Решу позже</Btn></>}
        </div>
      </Page>
    );
  }
  const head = <div className="between"><div style={{ display: 'grid', gap: 8, flex: 1, maxWidth: 320 }}><span className="r1-step">{`Шаг ${n} из 3`}</span><StepsBar n={n} of={3} /></div>{skipBtn}</div>;
  if (n === 2)
    return (
      <Page title="Настройка">
        {head}
        <div className="cols c2" style={{ gap: 28 }}>
          <div style={{ display: 'grid', gap: 26, minWidth: 0 }}><h1 className="h1">Чему хотите научиться?</h1>{opts2}</div>
          <div className="summary r1-sum" style={{ maxWidth: 'none' }}>
            <h4>Ваши занятия</h4>
            <dl>
              <div><dt>Для кого</dt><dd>{whoLabel}</dd></div>
              <div><dt>Направление</dt><dd style={dir ? { whiteSpace: 'nowrap' } : { color: 'var(--muted)', fontWeight: 600 }}>{dir || 'Не выбрано'}</dd></div>
              <div><dt>Предмет</dt><dd style={subject ? undefined : { color: 'var(--muted)', fontWeight: 600 }}>{subjShort || 'Не выбран'}</dd></div>
            </dl>
            <Btn v="primary" block onClick={next2}>Дальше</Btn>
            <Btn block onClick={back}>Назад</Btn>
          </div>
        </div>
      </Page>
    );
  return (
    <Page title="Настройка">
      <div className="r1-onb" style={n === 3 ? { maxWidth: 760 } : undefined}>
        {head}
        {n === 1 ? <>{body1}<Btn v="primary" onClick={next1} style={{ justifySelf: 'start', minWidth: 220 }}>Дальше</Btn></> : <>{body3(true)}<Btn onClick={() => finish('/account')} style={{ justifySelf: 'center', minWidth: 220 }}>Решу позже</Btn></>}
      </div>
    </Page>
  );
}
