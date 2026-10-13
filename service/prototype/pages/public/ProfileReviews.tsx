import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Page, ActionBar } from '../../ui/layout';
import { Btn, Chip, Empty, Stars, IBtn } from '../../ui/kit';
import { TutorPhoto } from '../../ui/domain';
import { usePhone } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, tutorBySlug, reviews as rv, tutors as tApi, sel } from '../../api';
import { ReviewItem } from './Profile';
import { fmtMoney, studentPrice } from '../../lib/money';
import { countLabel } from '../../lib/time';

export default function ProfileReviews() {
  const { slug } = useParams();
  const d = useDb();
  const phone = usePhone();
  const { toast } = useApp();
  const [sort, setSort] = useState<'new' | 'low' | 'high'>('new');
  const [stars, setStars] = useState(0);
  const [limit, setLimit] = useState(10);
  const t = tutorBySlug(d, slug);
  if (!t) return <Page title="Отзывы" back="/teachers"><Empty title="Анкета не найдена" /></Page>;
  const r = rv.tutorRating(d, t.userId);
  const first = t.name.split(' ')[0];
  let list = r.list.filter(x => !stars || x.rating === stars);
  if (sort === 'low') list = [...list].sort((a, b) => a.rating - b.rating);
  if (sort === 'high') list = [...list].sort((a, b) => b.rating - a.rating);
  const from = studentPrice(tApi.priceFrom(t));
  const head = (
    <div className={phone ? 'stack' : 'cols half'} style={{ alignItems: 'center' }}>
      <div className={phone ? 'r9-big' : 'r9-big r9-big--d'}><b>{r.count ? rv.fmtRating(r.avg) : '—'}</b><div style={{ display: 'grid', gap: 4 }}><Stars n={r.avg} /><span className="small">{countLabel(r.count, 'отзыв', 'отзыва', 'отзывов')}, все после оплаты</span></div></div>
      <div className="r9-bars">{r.dist.map(x => <div key={x.star}><span>{x.star}</span><i style={{ '--w': `${r.count ? Math.round((x.count / r.count) * 100) : 0}%` } as React.CSSProperties} /><em>{x.count}</em></div>)}</div>
    </div>
  );
  const filters = (
    <div className="chip-row">
      <Chip set={sort === 'new'} onClick={() => setSort('new')}>Сначала новые</Chip>
      <Chip set={sort === 'low'} onClick={() => setSort('low')}>Сначала низкие</Chip>
      <Chip set={sort === 'high'} onClick={() => setSort('high')}>Сначала высокие</Chip>
      {[5, 4, 3, 2, 1].map(s => r.dist.find(x => x.star === s)?.count ? <Chip key={s} set={stars === s} onClick={() => setStars(stars === s ? 0 : s)}>{`${s} ★`}</Chip> : null)}
    </div>
  );
  const body = list.length ? <div className="card" style={{ gap: 0 }}>{list.slice(0, limit).map(x => <ReviewItem key={x.id} r={x} tutorFirst={first} />)}{list.length > limit && <Btn size="s" onClick={() => setLimit(l => l + 10)} style={{ justifySelf: 'start', marginTop: 8 }}>Ещё отзывы</Btn>}</div> : <Empty icon="star" title="Пока нет отзывов">Отзывы появятся после первых оплаченных уроков.</Empty>;
  const share = async () => {
    await navigator.clipboard?.writeText(`${location.origin}/teachers/${t.slug}`).catch(() => undefined);
    toast('Ссылка скопирована', { tone: 'ok' });
  };
  if (phone)
    return (
      <Page title={`Отзывы: ${t.name}`} mTitle={t.name} back={`/teachers/${t.slug}`} right={<IBtn icon="share" label="Поделиться" onClick={share} />}
        bottom={<ActionBar meta={<>от {fmtMoney(from)}<small>60 мин</small></>}><Btn v="primary" to={`/teachers/${t.slug}#slots`}>Записаться</Btn></ActionBar>}>
        <div className="seg" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}><Btn size="s" v="white" to={`/teachers/${t.slug}`}>Анкета</Btn><button type="button" aria-selected="true">Отзывы {r.count}</button></div>
        <div className="card" style={{ gap: 16 }}>{head}</div>
        {filters}
        {body}
      </Page>
    );
  return (
    <Page title={`Отзывы: ${t.name}`}>
      <div className="cols c2" style={{ alignItems: 'start' }}>
        <div className="stack">
          <div className="between"><h1 className="h1">Отзывы · {t.name}</h1></div>
          <div className="card" style={{ padding: 22 }}>{head}</div>
          {filters}
          {body}
        </div>
        <div className="card r9-tch">
          <TutorPhoto t={t} />
          <div style={{ display: 'grid', gap: 2 }}><span className="h3">{t.name}</span><span className="small">{sel.cardSubjects(t)}{t.city ? ` · ${t.city}` : ''}</span></div>
          <div className="between"><span className="row" style={{ gap: 6 }}><Stars n={r.avg} /><b>{r.count ? rv.fmtRating(r.avg) : ''}</b></span><span className="money">от {fmtMoney(from)}</span></div>
          <Btn v="primary" block to={`/teachers/${t.slug}#slots`}>Записаться</Btn>
          <Btn block to={`/teachers/${t.slug}`}>Вся анкета</Btn>
        </div>
      </div>
    </Page>
  );
}
