import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Page, ActionBar, SiteHeader } from '../../ui/layout';
import { Alert, Btn, Empty, Note, Options, St, Stars } from '../../ui/kit';
import { Icon } from '../../ui/icons';
import { DateStrip, FavButton, SlotGrid, TutorPhoto, TzLine, daysFrom, useSlotPicker } from '../../ui/domain';
import { usePhone, useTitle } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, useSession, tutorBySlug, tutors as tApi, reviews as rv, schedule, chat as chatApi, booking } from '../../api';
import type { TutorProfile } from '../../api/types';
import { fmtMoney, studentPrice } from '../../lib/money';
import { nb } from '../../lib/text';
import { dative, genitive } from '../../lib/names';
import { countLabel, fmtDayTime, fmtDateShort, guessZone, plural, zoned, NB } from '../../lib/time';

export default function Profile() {
  const { slug } = useParams();
  const d = useDb();
  const me = useSession();
  const t = tutorBySlug(d, slug);
  if (!t || (!tApi.isListed(t) && t.userId !== me?.id)) return <Gone />;
  return <ProfileView t={t} />;
}

function Gone() {
  useTitle('Анкета недоступна');
  return (
    <Page title="Анкета недоступна" back="/teachers">
      <Empty icon="search" title="Анкета недоступна" style={{ justifySelf: 'center', marginTop: 32 }} action={<Btn v="primary" to="/teachers">Все преподаватели</Btn>}>Репетитор взял паузу или анкеты больше нет. Посмотрите других преподавателей.</Empty>
    </Page>
  );
}

export function ProfileView({ t, preview }: { t: TutorProfile; preview?: boolean }) {
  const d = useDb();
  const me = useSession();
  const phone = usePhone();
  const navigate = useNavigate();
  const { askLogin, toast, run } = useApp();
  const viewerTz = me?.tz ?? guessZone();
  const first = t.name.split(' ')[0];
  const rating = rv.tutorRating(d, t.userId);
  const docs = tApi.docsVerified(t);
  const lessonsDone = d.lessons.filter(l => l.tutorId === t.userId && l.status === 'completed' && l.kind === 'lesson').length;
  const introUsed = me ? booking.introUsed(d, me.id, t.userId) : false;
  const canIntro = t.intro.enabled && !introUsed;

  /* ---------- picker ---------- */
  const subjects = t.subjects.filter(s => t.prices.some(p => p.subject === s.subject));
  const [subject, setSubject] = useState(subjects[0]?.subject ?? '');
  const durations = t.prices.filter(p => p.subject === subject).sort((a, b) => a.minutes - b.minutes);
  const [dur, setDur] = useState<string>(() => String(durations.find(p => p.minutes === 60)?.minutes ?? durations[0]?.minutes ?? 60));
  const isIntro = dur === 'intro';
  const minutes = isIntro ? t.intro.minutes : Number(dur);
  const slots = useMemo(() => schedule.freeSlots(d, t, { minutes, forStudentId: me?.id }), [d, t, minutes, me?.id]);
  const picker = useSlotPicker(slots, viewerTz);
  const days = daysFrom(viewerTz, Math.min(t.horizonWeeks * 7 + 1, 15));
  const priceItem = durations.find(p => p.minutes === minutes);
  const total = isIntro ? 0 : studentPrice(priceItem?.price ?? 0);
  const nearest = slots.slice(0, 3);

  const book = () => {
    if (preview) return toast('Это предпросмотр: запись заработает после публикации');
    if (!picker.slot) return toast('Выберите дату и время');
    const to = isIntro
      ? `/teachers/${t.slug}/intro?start=${picker.slot}`
      : `/book/checkout?tutor=${t.slug}&start=${picker.slot}&minutes=${minutes}&subject=${encodeURIComponent(subject)}`;
    if (!me) return askLogin('Войдите, чтобы записаться', { type: 'go', to }, `Потом вернём вас к записи к ${first}.`);
    if (me.role !== 'student') return toast('Записываться могут ученики. Для этого нужен отдельный аккаунт.', { tone: 'bad' });
    navigate(to);
  };
  const write = () => {
    if (preview) return toast('Это предпросмотр анкеты');
    if (!me) return askLogin(`Войдите, чтобы написать ${first}`, { type: 'go', to: `/teachers/${t.slug}?write=1` });
    if (me.role !== 'student') return toast('Написать репетитору может ученик', { tone: 'bad' });
    const id = run(() => chatApi.openChatWithTutor(t.userId));
    if (id) navigate(`/messages/${id}`);
  };
  const intro = () => {
    if (preview) return toast('Это предпросмотр анкеты');
    const to = `/teachers/${t.slug}/intro`;
    if (!me) return askLogin('Войдите, чтобы записаться на знакомство', { type: 'go', to });
    navigate(to);
  };
  const share = async () => {
    const url = `${location.origin}/teachers/${t.slug}`;
    try {
      if (navigator.share && phone) await navigator.share({ title: t.name, url });
      else {
        await navigator.clipboard.writeText(url);
        toast('Ссылка на анкету скопирована', { tone: 'ok' });
      }
    } catch {
      /* cancelled */
    }
  };
  // «Написать» after login from a guest
  const writeParam = new URLSearchParams(location.search).get('write');
  if (writeParam && me?.role === 'student') {
    history.replaceState(null, '', location.pathname);
    window.setTimeout(write, 0);
  }

  const subj = t.subjects.map(s => s.subject.replace(/ язык$/, '')).join(' / ');
  const goalsLine = [...new Set(t.subjects.flatMap(s => s.goals))].slice(0, 3).join(' · ');
  const statsBox = (
    <div className="stats r3-stats" style={phone ? undefined : { background: 'var(--bg)', boxShadow: 'none' }}>
      <div><b>{rating.count ? rv.fmtRating(rating.avg) : '—'}</b><span>рейтинг</span></div>
      <div><b>{rating.count}</b><span>{plural(rating.count, 'отзыв', 'отзыва', 'отзывов')}</span></div>
      <div><b>{t.experienceYears ? `${t.experienceYears}${NB}${plural(t.experienceYears, 'год', 'года', 'лет')}` : '<1 года'}</b><span>опыт</span></div>
      <div><b>{lessonsDone}</b><span>{plural(lessonsDone, 'урок', 'урока', 'уроков')}</span></div>
    </div>
  );
  const tags = (
    <div className="r3-tags">
      {t.intro.enabled && <span className="r3-tag"><Icon name="gift" />Бесплатное знакомство {t.intro.minutes}{NB}мин</span>}
      {t.formats.online && <span className="r3-tag"><Icon name="video" />Онлайн: {t.services.filter(s => s !== 'Другое').join(', ') || 'видеосвязь'}</span>}
      {(t.formats.atHome || t.formats.atStudent) && <span className="r3-tag"><Icon name="home" />Очно{t.formats.district ? `: ${t.formats.district}` : ''}</span>}
      <span className="r3-tag"><Icon name="globe" />{t.city || 'Россия'}, {fmtTimeZone(t.tz)}</span>
    </div>
  );
  const about = t.about && <p style={{ color: '#3a3a3e' }}>{nb(t.about)}</p>;
  const eduCard = t.achievements.length > 0 && (
    <section className="card"><h2 className="h3">Образование и достижения</h2>
      <div className="r3-edu">{t.achievements.map((a, i) => <div key={i}><b>{a.title}</b><span>{a.text}</span>{(a.verified || (docs && t.docs.some(x => x.status === 'ok' && x.title && a.title.includes(x.title.split(',')[0])))) && <em><Icon name="check" />Проверен</em>}</div>)}</div>
    </section>
  );
  const expCard = t.experienceText && <section className="card"><h2 className="h3">Опыт преподавания</h2><p style={{ color: '#3a3a3e' }}>{nb(t.experienceText)}</p></section>;
  const howCard = t.approach && <section className="card"><h2 className="h3">Как проходят занятия</h2><p style={{ color: '#3a3a3e' }}>{nb(t.approach)}</p></section>;
  const topicsCard = t.helpTopics.length > 0 && <section className="card"><h2 className="h3">С чем поможет</h2><div className="r3-tags">{t.helpTopics.map(x => <span key={x} className="r3-tag">{x}</span>)}</div></section>;
  const pricesCard = (
    <section className="card">
      <div className="between"><h2 className="h3">Цены для вас</h2><span className="small">за урок</span></div>
      <div className="r3-prices">
        {t.prices.map(p => <div key={p.id}><span>{p.subject.replace(/ язык$/, '')}, {p.minutes}{NB}мин</span><b>{fmtMoney(studentPrice(p.price))}</b></div>)}
        {t.intro.enabled && <div><span>Знакомство, {t.intro.minutes}{NB}мин</span><b style={{ color: 'var(--green)' }}>бесплатно</b></div>}
      </div>
      <Note icon="info">{`Деньги замораживаются при записи и списываются, когда ${first} подтвердит урок.`}</Note>
    </section>
  );
  const pickerCard = (
    <section className="card" id="slots">
      <div className="between"><h2 className="h3">Свободное время</h2><span className="small nowrap">на {t.horizonWeeks}{NB}{plural(t.horizonWeeks, 'неделю', 'недели', 'недель')} вперёд</span></div>
      <div className="r3-pick">
        {subjects.length > 1 && <Options className="r3-sb" legend="Предмет" options={subjects.map(s => s.subject)} value={subject} onChange={v => { setSubject(v); setDur(String(t.prices.find(p => p.subject === v)?.minutes ?? 60)); }} />}
        <Options className="r3-du" legend="Длительность" value={dur} onChange={setDur}
          options={[...(canIntro ? [{ value: 'intro', label: `Знакомство ${t.intro.minutes} мин`, small: 'бесплатно' }] : []), ...durations.map(p => ({ value: String(p.minutes), label: `${p.minutes} мин`, small: fmtMoney(studentPrice(p.price)) }))]} />
        {slots.length ? (
          <>
            <DateStrip days={days} selected={picker.day} onSelect={picker.setDay} tz={viewerTz} available={picker.available} />
            <TzLine viewerTz={viewerTz} otherTz={t.tz} otherName={genitive(first)} sample={picker.slot} />
            <SlotGrid slots={picker.byDay.get(picker.day) ?? []} selected={picker.slot} onSelect={picker.setSlot} tz={viewerTz} />
            {nearest.length > 0 && <span className="small">Ближайшие окна: {nearest.map(s => `${fmtDayTime(s, viewerTz)}`).join(', ')}.</span>}
          </>
        ) : <Note icon="cal">{`Свободных окон на ближайшие ${t.horizonWeeks * 7} дней нет. Напишите ${first} или создайте заявку.`}</Note>}
      </div>
    </section>
  );
  const reviewsCard = (
    <section className="card">
      <div className="between"><h2 className="h3">Отзывы</h2>{rating.count > 2 && <Btn size="s" to={`/teachers/${t.slug}/reviews`}>{`Все ${rating.count}`}</Btn>}</div>
      {rating.count ? (
        <>
          <div className="r3-score"><b>{rv.fmtRating(rating.avg)}</b><div style={{ display: 'grid', gap: 2 }}><Stars n={rating.avg} /><span className="small">{countLabel(rating.count, 'отзыв', 'отзыва', 'отзывов')} после оплаченных уроков</span></div></div>
          <div>{rating.list.slice(0, 2).map(r => <ReviewItem key={r.id} r={r} tutorFirst={first} />)}</div>
        </>
      ) : <Empty icon="star" title="Пока нет отзывов" style={{ maxWidth: 'none', boxShadow: 'none', background: 'var(--bg)' }}>Отзывы появятся после первых оплаченных уроков.</Empty>}
    </section>
  );
  const sideButtons = (
    <div style={{ display: 'grid', gap: 8 }}>
      {canIntro && <Btn v="tinted" block onClick={intro}>{`Бесплатное знакомство · ${t.intro.minutes} мин`}</Btn>}
      {introUsed && t.intro.enabled && <span className="small" style={{ textAlign: 'center' }}>Знакомство с {first} уже было</span>}
      <Btn block icon="chat" onClick={write}>{`Написать ${dative(first)}`}</Btn>
      {me?.role === 'student' && <Btn block size="s" icon="repeat" to={`/teachers/${t.slug}/series`}>Заниматься регулярно</Btn>}
    </div>
  );
  const whenLabel = picker.slot ? fmtDayTime(picker.slot, viewerTz) : 'Выберите время';
  const pauseBanner = !t.visible && t.published && <Alert tone="action" icon="pause" title="Анкета на паузе">Ученики её сейчас не видят.</Alert>;

  if (phone)
    return (
      <PageShell title={t.name} preview={preview}>
        <div className="r3-cover">
          <TutorPhoto t={t} />
          <div className="r3-cover-bar">
            <button className="btn btn--on-color btn--circle btn--m" type="button" aria-label="Назад" onClick={() => (history.length > 1 ? navigate(-1) : navigate('/teachers'))}><Icon name="left" /></button>
            <span><button className="btn btn--on-color btn--circle btn--m" type="button" aria-label="Поделиться" onClick={share}><Icon name="share" /></button>{!preview && <FavButton tutor={t} />}</span>
          </div>
        </div>
        <div className="r3-body" style={{ paddingBottom: 130 }}>
          {pauseBanner}
          <div style={{ display: 'grid', gap: 8 }}>
            <h1 className="r3-name">{t.name}</h1>
            <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{subj}{goalsLine ? ` · ${goalsLine}` : ''}</span>
            <div className="row-s">{docs && <St tone="ok" icon="shield">Документы проверены</St>}</div>
          </div>
          {statsBox}
          {about}
          {tags}
          {pickerCard}
          {pricesCard}
          {eduCard}{expCard}{topicsCard}{howCard}
          {reviewsCard}
          {sideButtons}
        </div>
        <div className="float-bottom bottom-fixed">
          <ActionBar meta={<>{nb(whenLabel)}<small>{nb(isIntro ? `${minutes} мин · бесплатно` : `${minutes} мин · ${fmtMoney(total)}`)}</small></>}>
            <Btn v="primary" onClick={book} disabled={!slots.length}>Записаться</Btn>
          </ActionBar>
        </div>
      </PageShell>
    );

  return (
    <PageShell title={t.name} preview={preview}>
      <div className="desk-in">
        {!preview && <div><Btn size="s" icon="left" onClick={() => (history.length > 1 ? navigate(-1) : navigate('/teachers'))}>Все преподаватели</Btn></div>}
        {pauseBanner}
        <div className="cols c2">
          <main className="stack" style={{ gap: 16 }}>
            <section className="card" style={{ padding: 16 }}>
              <div className="r3-prof-top">
                <div className="r3-photo"><TutorPhoto t={t} />{!preview && <FavButton tutor={t} />}</div>
                <div style={{ display: 'grid', gap: 14, padding: '8px 8px 8px 0', minWidth: 0, alignContent: 'start' }}>
                  <div className="between" style={{ alignItems: 'flex-start' }}>
                    <div style={{ display: 'grid', gap: 4 }}><h1 className="h1">{t.name}</h1><span style={{ color: 'var(--muted)', fontWeight: 600 }}>{subj}{goalsLine ? ` · ${goalsLine}` : ''}</span></div>
                    <Btn size="s" icon="share" onClick={share}>Поделиться</Btn>
                  </div>
                  <div className="row-s">{docs && <St tone="ok" icon="shield">Документы проверены</St>}</div>
                  {about}
                  {tags}
                  {statsBox}
                </div>
              </div>
            </section>
            {eduCard}
            {(expCard || howCard) && <div className="cols half">{expCard}{howCard}</div>}
            {topicsCard}
            {pricesCard}
            {pickerCard}
            {reviewsCard}
          </main>
          <aside className="r3-sticky">
            <div className="summary">
              <h4>Ваши занятия</h4>
              <dl>
                <div><dt>Репетитор</dt><dd>{t.name}</dd></div>
                <div><dt>Предмет</dt><dd>{isIntro ? 'Знакомство' : subject.replace(/ язык$/, '')}</dd></div>
                <div><dt>Когда</dt><dd>{picker.slot ? nb(fmtDayTime(picker.slot, viewerTz)) : <span className="muted">Не выбрано</span>}</dd></div>
                <div><dt>{isIntro ? 'Знакомство' : 'Урок'}, {minutes}{NB}мин</dt><dd>{isIntro ? 'бесплатно' : fmtMoney(total)}</dd></div>
              </dl>
              <div className="total"><span>К оплате</span><b>{fmtMoney(total)}</b></div>
              <Btn v="primary" block onClick={book} disabled={!slots.length}>Записаться</Btn>
              <span className="hint">{nb(isIntro ? 'Без оплаты. Знакомство одно с каждым репетитором.' : `Деньги замораживаются и списываются, когда ${first} подтвердит урок. Бесплатная отмена за 4 часа до начала.`)}</span>
            </div>
            <div className="card" style={{ gap: 8, padding: 16 }}>{sideButtons}</div>
          </aside>
        </div>
      </div>
    </PageShell>
  );
}

function PageShell({ title, preview, children }: { title: string; preview?: boolean; children: ReactNode }) {
  useTitle(preview ? 'Как видят ученики' : title);
  const phone = usePhone();
  return (
    <div className={phone ? 'page is-phone' : 'page'}>
      {!phone && <SiteHeader />}
      {preview && <PreviewBanner />}
      <div id="main" tabIndex={-1}>{children}</div>
    </div>
  );
}


function PreviewBanner() {
  const phone = usePhone();
  if (phone)
    return (
      <div className="float-top" style={{ position: 'fixed', zIndex: 45, paddingTop: 12 }}>
        <div className="r2-banner glass"><Icon name="eye" /><span>Так вас видят ученики</span><Btn v="white" size="s" to="/tutor/profile/publish">Назад</Btn></div>
      </div>
    );
  return (
    <div style={{ maxWidth: 1200, margin: '16px auto 0', padding: '0 24px' }}>
      <Alert tone="action" icon="eye" title="Так вас видят ученики" style={{ maxWidth: 'none' }} action={<Btn v="white" size="s" to="/tutor/profile/publish">Вернуться к публикации</Btn>}>Кнопки записи заработают после публикации.</Alert>
    </div>
  );
}

export function ReviewItem({ r, tutorFirst }: { r: ReturnType<typeof rv.tutorRating>['list'][number]; tutorFirst: string }) {
  const d = useDb();
  const author = d.users.find(u => u.id === r.studentId);
  const l = d.lessons.find(x => x.id === r.lessonId);
  const lessonsCount = d.lessons.filter(x => x.studentId === r.studentId && x.tutorId === r.tutorId && x.status === 'completed' && x.kind === 'lesson').length;
  return (
    <div className="r3-rev">
      <div className="r3-rev-h">
        <div className={`ava ph ph-${author?.tone ?? 'teal'}`}><svg className="ph-person" viewBox="0 0 200 220" aria-hidden="true" style={{ width: '86%' }}><use href="#i-person" /></svg></div>
        <div style={{ display: 'grid', minWidth: 0 }}>
          <div className="between"><b>{author?.name.split(' ')[0] ?? 'Ученик'}</b><Stars n={r.rating} /></div>
          <span className="small">{l ? `${fmtDateShort(r.publishedAt ?? r.createdAt, 'Europe/Moscow')} · ${l.subject.replace(/ язык$/, '')} · ${countLabel(lessonsCount, 'урок', 'урока', 'уроков')}` : ''}</span>
        </div>
      </div>
      <p>{nb(r.text)}</p>
      {r.reply && <div className="r3-reply"><b>Ответ {genitive(tutorFirst)}</b>{nb(r.reply.text)}</div>}
    </div>
  );
}

export { dative, genitive } from '../../lib/names';

function fmtTimeZone(tz: string) {
  const diff = (zoned(Date.now(), tz).hour - zoned(Date.now(), 'Europe/Moscow').hour + 24) % 24;
  const d = diff > 12 ? diff - 24 : diff;
  return d === 0 ? 'МСК' : `МСК${d > 0 ? '+' : '−'}${Math.abs(d)}`;
}

