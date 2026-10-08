import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Page } from '../../ui/layout';
import { Btn, Checks, Chip, Dropdown, Empty, IBtn, MenuItem, Options, Sheet, cx } from '../../ui/kit';
import { Icon } from '../../ui/icons';
import { TeacherGrid } from '../../ui/domain';
import { usePhone } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, useSession, catalog, sel } from '../../api';
import { SearchBar } from './SearchBar';
import { countLabel, NB } from '../../lib/time';
import { fmtMoney } from '../../lib/money';

const PRICE_PRESETS = [1200, 1800, 2500];
const SORTS: { value: sel.CatalogFilters['sort']; label: string }[] = [
  { value: 'rec', label: 'Рекомендуемые' },
  { value: 'cheap', label: 'Дешевле' },
  { value: 'pricey', label: 'Дороже' },
  { value: 'reviews', label: 'Больше отзывов' },
];

export default function Catalog() {
  const d = useDb();
  const me = useSession();
  const phone = usePhone();
  const { askLogin } = useApp();
  const [sp, setSp] = useSearchParams();
  const f = useMemo(() => sel.parseFilters(sp), [sp]);
  const [menu, setMenu] = useState<'' | 'subject' | 'goal' | 'price' | 'time' | 'sort'>('');
  const [sheet, setSheet] = useState(false);
  const items = sel.searchTutors(d, f);
  const subjects = sel.catalogSubjects(d);
  const goals = sel.catalogGoals(d, f.subject);
  const dir = catalog.directionById(f.dir);
  const extra = sel.activeFilterCount(f);

  const apply = (changes: Partial<sel.CatalogFilters>) => {
    setMenu('');
    setSp(new URLSearchParams(sel.filtersToSearch({ ...f, ...changes }).slice(1)), { replace: true });
  };
  const toggle = (k: typeof menu) => setMenu(m => (m === k ? '' : k));
  const title = f.subject ? `Репетиторы: ${f.subject.toLowerCase()}` : dir ? dir.title : 'Топ репеты';
  const right = me?.role === 'student' ? <IBtn icon="heart" label="Избранное" to="/me/favorites" /> : !me ? <Btn size="s" v="white" onClick={() => askLogin()}>Войти</Btn> : null;

  const chips = (
    <div className="r3-chips">
      <div className="chip-row">
        <Chip icon="filter" label="Ещё фильтры" onClick={() => setSheet(true)} count={extra} set={extra > 0} expanded={sheet}>{phone ? undefined : 'Ещё фильтры'}</Chip>
        <span className="filter" data-dd-anchor>
          <Chip set={!!f.subject} menu expanded={menu === 'subject'} onClick={() => toggle('subject')}>{f.subject ? f.subject.replace(/ язык$/, '') : 'Предмет'}</Chip>
        </span>
        <span className="filter" data-dd-anchor>
          <Chip set={!!f.goal} menu expanded={menu === 'goal'} onClick={() => toggle('goal')}>{f.goal || 'Цель'}</Chip>
        </span>
        <span className="filter" data-dd-anchor>
          <Chip set={!!(f.pmax || f.pmin)} menu expanded={menu === 'price'} onClick={() => toggle('price')}>{f.pmax ? `до ${fmtMoney(f.pmax)}` : f.pmin ? `от ${fmtMoney(f.pmin)}` : 'Цена'}</Chip>
        </span>
        <span className="filter" data-dd-anchor>
          <Chip set={f.time.length > 0} menu expanded={menu === 'time'} onClick={() => toggle('time')}>{f.time.length === 1 ? catalog.TIME_BUCKETS.find(b => b.id === f.time[0])?.label : f.time.length ? `Когда · ${f.time.length}` : 'Когда'}</Chip>
        </span>
        {!phone && <Chip set={f.intro} onClick={() => apply({ intro: !f.intro })}>Есть знакомство</Chip>}
        {!phone && (extra > 0 || f.subject || f.q || f.dir) && <Btn size="s" onClick={() => apply({ ...sel.EMPTY_FILTERS, sort: f.sort })} style={{ minHeight: 36 }}>Сбросить фильтры</Btn>}
      </div>
      <Dropdown open={menu === 'subject'} onClose={() => setMenu('')} style={{ top: 48 }}>
        <MenuItem checked={!f.subject} onClick={() => apply({ subject: '', goal: '' })}>Все предметы</MenuItem>
        {subjects.map(s => <MenuItem key={s} checked={f.subject === s} onClick={() => apply({ subject: s, goal: '' })}>{s}</MenuItem>)}
      </Dropdown>
      <Dropdown open={menu === 'goal'} onClose={() => setMenu('')} style={{ top: 48 }}>
        <MenuItem checked={!f.goal} onClick={() => apply({ goal: '' })}>Любая цель</MenuItem>
        {goals.map(g => <MenuItem key={g} checked={f.goal === g} onClick={() => apply({ goal: g })}>{g}</MenuItem>)}
      </Dropdown>
      <Dropdown open={menu === 'price'} onClose={() => setMenu('')} style={{ top: 48 }}>
        <MenuItem checked={!f.pmax && !f.pmin} onClick={() => apply({ pmin: null, pmax: null })}>Любая цена</MenuItem>
        {PRICE_PRESETS.map(p => <MenuItem key={p} checked={f.pmax === p && !f.pmin} onClick={() => apply({ pmin: null, pmax: p })}>{`до ${fmtMoney(p)}`}</MenuItem>)}
        <MenuItem onClick={() => { setMenu(''); setSheet(true); }}>Своя цена…</MenuItem>
      </Dropdown>
      <Dropdown open={menu === 'time'} onClose={() => setMenu('')} style={{ top: 48 }}>
        {catalog.TIME_BUCKETS.map(b => <MenuItem key={b.id} checked={f.time.includes(b.id)} onClick={() => apply({ time: f.time.includes(b.id) ? f.time.filter(x => x !== b.id) : [...f.time, b.id] })}>{b.label}</MenuItem>)}
      </Dropdown>
    </div>
  );

  const sortRow = (
    <div className="between">
      <span className="found" style={{ whiteSpace: 'nowrap' }}><span className="hide-phone">Найдено: </span><b>{countLabel(items.length, 'преподаватель', 'преподавателя', 'преподавателей')}</b></span>
      <span className="filter" data-dd-anchor>
        <button className="r3-sortbtn" type="button" aria-expanded={menu === 'sort'} onClick={() => toggle('sort')}><span className="hide-phone">Сортировка:{NB}</span>{SORTS.find(s => s.value === f.sort)?.label}<Icon name="down" /></button>
        <Dropdown open={menu === 'sort'} onClose={() => setMenu('')} align="right" style={{ top: 34 }}>
          {SORTS.map(s => <MenuItem key={s.value} checked={f.sort === s.value} onClick={() => apply({ sort: s.value })}>{s.label}</MenuItem>)}
        </Dropdown>
      </span>
    </div>
  );

  const relax = items.length ? [] : sel.relaxations(d, f);
  const empty = (
    <Empty icon="search" title="По вашему запросу преподавателей не нашлось" className="r3-empty" style={{ maxWidth: 600, justifySelf: 'center' }}
      action={
        <>
          {relax.length > 0 && <div className="row" style={{ justifyContent: 'center', gap: 8 }}>{relax.map(r => <Btn key={r.key} v="tinted" size="s" onClick={() => apply(r.reset)}>{`Убрать «${r.label}» · +${r.gain}`}</Btn>)}</div>}
          <div className="row" style={{ justifyContent: 'center', gap: 8, marginTop: 6 }}>
            <Btn v="primary" onClick={() => apply({ ...sel.EMPTY_FILTERS })}>Показать всех</Btn>
            {me ? <Btn to="/requests/new">Создать заявку</Btn> : <Btn onClick={() => askLogin('Войдите, чтобы создать заявку', { type: 'go', to: '/requests/new' })}>Создать заявку</Btn>}
          </div>
          <span className="small" style={{ maxWidth: '40ch' }}>По заявке репетиторы сами предложат время и цену.</span>
        </>
      }>
      {relax.length ? 'Попробуйте другое имя, предмет или тему. Чаще всего мешают цена и время:' : 'Попробуйте другое имя, предмет или тему.'}
    </Empty>
  );

  return (
    <Page title={title} kind="site" tab="Найти">
      {phone ? <div className="between"><h1 className="h1">{title}</h1>{right}</div> : <div className="title-block"><h1 className="h1">{title}</h1><p className="sub">{dir ? dir.text : 'Найдите преподавателя, с которым будет комфортно учиться и двигаться к цели.'}</p></div>}
      <SearchBar initial={f.q} base={f} onSubmit={ch => apply(ch)} />
      {chips}
      {sortRow}
      {items.length ? <TeacherGrid items={items} subject={f.subject || undefined} /> : empty}
      <FiltersSheet open={sheet} onClose={() => setSheet(false)} f={f} onApply={apply} subjects={subjects} />
    </Page>
  );
}

function FiltersSheet({ open, onClose, f, onApply, subjects }: { open: boolean; onClose: () => void; f: sel.CatalogFilters; onApply: (c: Partial<sel.CatalogFilters>) => void; subjects: string[] }) {
  const d = useDb();
  const [draft, setDraft] = useState(f);
  const [lastOpen, setLastOpen] = useState(false);
  if (open && !lastOpen) {
    setLastOpen(true);
    setDraft(f);
  }
  if (!open && lastOpen) setLastOpen(false);
  const set = (c: Partial<sel.CatalogFilters>) => setDraft(x => ({ ...x, ...c }));
  const count = sel.searchTutors(d, draft).length;
  const goals = sel.catalogGoals(d, draft.subject);
  return (
    <Sheet open={open} onClose={onClose} title="Фильтры">
      <div className="r3-fp">
        <div className="field" style={{ maxWidth: 'none' }}>
          <label htmlFor="flt-subj">Предмет</label>
          <select id="flt-subj" className="input" value={draft.subject} onChange={e => set({ subject: e.target.value, goal: '' })}>
            <option value="">Все предметы</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <Options legend="Цель" options={[{ value: '', label: 'Любая' }, ...goals.map(g => ({ value: g, label: g }))]} value={draft.goal} onChange={v => set({ goal: v })} />
        <div className="field" style={{ maxWidth: 'none' }}>
          <label>Цена за 60 мин</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input className="input" aria-label="От, ₽" inputMode="numeric" placeholder="от, ₽" value={draft.pmin ?? ''} onChange={e => set({ pmin: Number(e.target.value.replace(/\D/g, '')) || null })} />
            <input className="input" aria-label="До, ₽" inputMode="numeric" placeholder="до, ₽" value={draft.pmax ?? ''} onChange={e => set({ pmax: Number(e.target.value.replace(/\D/g, '')) || null })} />
          </div>
          <span className="small" style={{ paddingLeft: 4 }}>Цены указаны за урок, как к оплате.</span>
        </div>
        <Options legend="Формат" options={[{ value: '', label: 'Любой' }, { value: 'online', label: 'Онлайн' }, { value: 'offline', label: 'Очно' }]} value={draft.fmt} onChange={v => set({ fmt: v as sel.CatalogFilters['fmt'] })} />
        <Checks legend="Когда удобно" options={catalog.TIME_BUCKETS.map(b => ({ value: b.id as string, label: b.label }))} value={draft.time} onChange={v => set({ time: v })} />
        <Options legend="Рейтинг" options={[{ value: '0', label: 'Любой' }, { value: '4.5', label: '4,5+' }, { value: '4.8', label: '4,8+' }]} value={String(draft.rating)} onChange={v => set({ rating: Number(v) as sel.CatalogFilters['rating'] })} />
        <Checks legend="Ещё" options={[{ value: 'exp3', label: 'Опыт от 3 лет' }, { value: 'docs', label: 'Документы проверены' }, { value: 'intro', label: 'Бесплатное знакомство' }]} value={[draft.exp3 && 'exp3', draft.docs && 'docs', draft.intro && 'intro'].filter(Boolean) as string[]} onChange={v => set({ exp3: v.includes('exp3'), docs: v.includes('docs'), intro: v.includes('intro') })} />
        <Options legend="Преподаватель" options={[{ value: '', label: 'Любой' }, { value: 'f', label: 'Женщина' }, { value: 'm', label: 'Мужчина' }]} value={draft.gender} onChange={v => set({ gender: v as sel.CatalogFilters['gender'] })} />
        <Options legend="Ученик" options={[{ value: '', label: 'Любой' }, { value: 'adult', label: 'Взрослый' }, { value: 'school', label: 'Школьник' }, { value: 'preschool', label: 'Дошкольник' }]} value={draft.age} onChange={v => set({ age: v as sel.CatalogFilters['age'] })} />
      </div>
      <div className={cx('r3-sheetfoot', 'sheet-foot')} style={{ display: 'grid', gap: 8 }}>
        <Btn v="primary" block onClick={() => { onApply(draft); onClose(); }}>{count ? `Показать ${countLabel(count, 'преподавателя', 'преподавателей', 'преподавателей')}` : 'Никого не нашлось'}</Btn>
        <Btn block size="s" onClick={() => setDraft({ ...sel.EMPTY_FILTERS, q: f.q, sort: f.sort })}>Сбросить</Btn>
      </div>
    </Sheet>
  );
}
