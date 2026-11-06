import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, LESSON_MINUTES, staticTutors, type Tutor } from '../../api';
import { trackGoal } from '../../../shared/lib/analytics';
import { TutorMetadata } from '../../../app/tutor-metadata';
import { useQuery } from '../../api/hooks';
import { useSession } from '../../api/session';
import { PublicLayout } from '../../layout/layouts';
import { minutes, rub, whenLabel } from '../../lib/format';
import { rv } from '../../reveal';
import { BackLink, Button, EmptyState, ErrorState, Icon, IconButton, LoadingList, Note, PageHeader, QueryView, Rows, Section, SlotPicker, Status, Tags } from '../../ui';
import { NotFoundBody } from './notfound';

const ACH_ICONS = ['target', 'school', 'book'] as const;

/** Анкета репетитора: данные, календарь записи, цены, отзывы. Карточка записи справа (на телефоне — панель снизу). */
export default function ProfilePage() {
  const { id = '' } = useParams();
  const initial = useMemo(() => staticTutors().find((t) => t.id === id), [id]);
  const tutorQuery = useQuery(`tutor-${id}`, () => api.getTutor(id), initial);
  const tutor = tutorQuery.data;
  if (tutorQuery.status === 404 || (!tutor && !tutorQuery.loading && !tutorQuery.error)) {
    return <PublicLayout tight><TutorMetadata tutor={null} /><NotFoundBody title="Анкета не найдена" text="Возможно, ссылка устарела или анкета снята с публикации." action={<Button to="/teachers" size="lg">К преподавателям</Button>} /></PublicLayout>;
  }
  if (tutorQuery.error) return <PublicLayout tight><PageHeader title="Анкета преподавателя" /><ErrorState text={tutorQuery.error} onRetry={tutorQuery.reload} /></PublicLayout>;
  if (!tutor) return <PublicLayout tight><PageHeader title="Анкета преподавателя" /><LoadingList rows={3} /></PublicLayout>;
  return <Profile key={id} tutor={tutor} />;
}

function Profile({ tutor }: { tutor: Tutor }) {
  const navigate = useNavigate();
  const { user } = useSession();
  const lessonMinutes = tutor.durations?.includes(LESSON_MINUTES) ? LESSON_MINUTES : tutor.durations?.[0] ?? LESSON_MINUTES;
  const lessonPrice = Math.round(tutor.studentPrice * lessonMinutes / 60);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [start, setStart] = useState<string | null>(null);
  const from = useMemo(() => new Date().toISOString(), []);
  const slots = useQuery(`slots-${tutor.id}`, () => api.getTutorSlots(tutor.id, from, 14, lessonMinutes));
  const reviews = useQuery(`reviews-${tutor.id}`, () => api.getTutorReviews(tutor.id));
  const isTutorAccount = user?.role === 'tutor' || user?.role === 'admin';
  const location = useLocation();
  const fromChat = (location.state as { back?: string } | null)?.back;
  // «Записаться» закреплена внизу экрана, а у блока со временем встаёт на своё место
  const ctaSlot = useRef<HTMLDivElement>(null);
  const heroPhoto = useRef<HTMLImageElement>(null);
  const [docked, setDocked] = useState(false);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const node = ctaSlot.current;
      if (!node) return;
      const r = node.getBoundingClientRect();
      setDocked(r.bottom <= window.innerHeight - 12);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (frame) cancelAnimationFrame(frame); };
  }, []);
  // полоса браузера над страницей берёт цвет верха фотографии, чтобы фото казалось идущим до самого края
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) return undefined;
    const previous = meta.content;
    let cancelled = false;
    const img = heroPhoto.current;
    if (!img) return undefined;
    const applyColor = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 24; canvas.height = 4;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight * 0.04, 0, 0, 24, 4);
        const data = ctx.getImageData(0, 0, 24, 4).data;
        let r = 0; let g = 0; let b = 0;
        for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
        const n = data.length / 4;
        if (!cancelled) meta.content = `rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`;
      } catch { /* фото с другого адреса нельзя прочитать: оставляем белый */ }
    };
    if (img.complete && img.naturalWidth) applyColor();
    else img.addEventListener('load', applyColor, { once: true });
    return () => { cancelled = true; img.removeEventListener('load', applyColor); meta.content = previous; };
  }, [tutor.photo]);
  // назад — по истории, если она есть; иначе к каталогу
  const close = () => { if (location.key !== 'default') void navigate(-1); else void navigate('/teachers'); };
  const share = () => {
    const url = window.location.href;
    if (navigator.share) void navigator.share({ title: tutor.name, url }).catch(() => undefined);
    else void navigator.clipboard?.writeText(url).catch(() => undefined);
  };

  const bookHref = (kind: 'regular' | 'intro') => `/book/${tutor.id}?kind=${kind}${start ? `&start=${encodeURIComponent(start)}` : ''}`;
  const write = () => navigate(`/me/chats/new?tutor=${tutor.id}`);

  const booking = (
    <div className="card sum" {...rv('right', 0.1)}>
      <h2 className="trk-cardtitle">Запись</h2>
      <Rows boxed rows={[['Репетитор', tutor.name], ['Занятие', minutes(lessonMinutes)], ['Когда', start ? whenLabel(start) : 'Выберите время'], ...(tutor.introMinutes ? [['Знакомство', `${minutes(tutor.introMinutes)}, бесплатно`] as [string, string]] : [])]} />
      <div className="fr fb"><span>Цена за {minutes(lessonMinutes)}</span><b className="tn trk-price-xl">{rub(lessonPrice)}</b></div>
      {isTutorAccount ? <Note tone="plain">Записываться могут ученики. Войдите в аккаунт ученика.</Note> : (
        <>
          <Button to={bookHref('regular')} size="lg" block disabled={!start} onClick={() => trackGoal('book_start', { kind: 'regular' })}>{start ? 'Записаться' : 'Выберите время'}</Button>
          <Button variant="fill" block icon="chat" onClick={write}>Написать репетитору</Button>
        </>
      )}
    </div>
  );

  return (
    <PublicLayout tight bareMobile>
      <TutorMetadata tutor={tutor} />
      <div className="trh-pf-backwrap"><BackLink to={fromChat ?? '/teachers'}>{fromChat && /^\/(me|tutor)\/chats/.test(fromChat) ? 'К сообщениям' : 'Все преподаватели'}</BackLink></div>
      <div className="trh-pf">
        <div className="trh-pf-main">
          <section className="trh-pf-top">
            <div className="trh-pf-photo" {...rv('scale')}>
              <img ref={heroPhoto} src={tutor.photo} srcSet={tutor.photoSrcSet} sizes="(min-width: 761px) 300px, 100vw" alt={`Фото: ${tutor.name}`} fetchPriority="high" decoding="async" />
              <IconButton icon="back" label="Назад" onClick={close} className="trh-pf-back" />
              <IconButton icon="share" label="Поделиться" onClick={share} className="trh-pf-share" />
            </div>
            <div className="trh-pf-sheet">
              <div className="trh-sec">
                <h1 className="trh-h1">{tutor.name}</h1>
                <p className="muted trh-pf-role">{tutor.headline}</p>
                <div className="fr fw u-gap8">
                  {tutor.documentsVerified && <Status tone="ok" icon="shield">Документы проверены</Status>}
                  {tutor.introMinutes > 0 && <span className="trh-pf-intro-tag"><Icon name="gift" />Бесплатное знакомство</span>}
                </div>
              </div>
              <p className="trh-pf-intro">{tutor.intro}</p>
            </div>
          </section>

          <hr className="rule" />
          <Section title="Образование и достижения">
            <ul className="ach">
              {tutor.achievements.filter((item) => item.title.trim() || item.text.trim()).map((item, index) => (
                <li key={item.title} {...rv('up', index * 0.08)}>
                  <span className="ic-sq"><Icon name={ACH_ICONS[index % ACH_ICONS.length]} /></span>
                  <div>{item.title.trim() && <b>{item.title}</b>}{item.text.trim() && <span className="d">{item.text}</span>}</div>
                </li>
              ))}
            </ul>
          </Section>

          <hr className="rule" />
          <div className="trh-pf-two">
            <Section title="Опыт"><div {...rv('up', 0.05)}><Tags items={[tutor.experience]} /></div></Section>
            <Section title="С чем поможет"><div {...rv('up', 0.05)}><Tags items={tutor.helpTopics} /></div></Section>
          </div>

          <hr className="rule" />
          <Section title="Как проходят занятия"><p className="cap trh-pf-text" {...rv('up', 0.05)}>{tutor.approach}</p></Section>

          <hr className="rule" />
          <Section title="Цены">
            <div {...rv('up', 0.05)}>
              {tutor.introMinutes > 0 && <div className="rowline"><span><b>Знакомство</b><br /><span className="muted">{minutes(tutor.introMinutes)}, один раз</span></span><b className="u-ok">бесплатно</b></div>}
              <div className="rowline"><span><b>Занятие</b><br /><span className="muted">{minutes(lessonMinutes)}</span></span><b className="tn">{rub(lessonPrice)}</b></div>
            </div>
          </Section>

          <hr className="rule" />
          <Section title="Свободное время">
            {slots.error ? <Note tone="bad">{slots.error}</Note> : <SlotPicker slots={slots.data ?? []} loading={slots.loading && !slots.data} value={start} onChange={setStart} />}
          </Section>
          {!isTutorAccount && (
            <div className="trh-pf-cta-slot" ref={ctaSlot}>
              <div className={`trh-pf-cta${docked ? ' docked' : ''}`}>
                <Button to={start ? bookHref('regular') : undefined} onClick={start ? () => trackGoal('book_start', { kind: 'regular' }) : () => document.querySelector('.trk-slots')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>Записаться</Button>
              </div>
            </div>
          )}

          <hr className="rule" />
          <Section title="Отзывы" action={tutor.reviewsCount > 3 ? <button type="button" className="acc sb" aria-expanded={showAllReviews} onClick={() => setShowAllReviews((v) => !v)}>{showAllReviews ? 'Свернуть' : 'Все отзывы'}</button> : undefined}>
            <QueryView query={reviews} loading={<span />} empty={(list) => (list.length ? null : <EmptyState icon="chat" title="Отзывов пока нет" text="Отзывы появляются после оплаченных занятий." />)}>
              {(list) => (
                <div className="trk-list">
                  {(showAllReviews ? list : list.slice(0, 3)).map((r) => (
                    <div className="rv" key={r.id}>
                      <div className="fr fb"><b>{r.authorName}</b><span className="rt">{Array.from({ length: r.rating }, (_, i) => <Icon key={i} name="star-on" />)}</span></div>
                      <p>{r.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </QueryView>
          </Section>
        </div>
        <aside className="trh-pf-aside" aria-label="Запись">{booking}</aside>
      </div>

    </PublicLayout>
  );
}
