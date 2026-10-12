import { Link } from 'react-router-dom';
import { Page } from '../../ui/layout';
import { Btn, Note, Ph } from '../../ui/kit';
import { Icon } from '../../ui/icons';
import { usePhone } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import type { Tone } from '../../api/types';

export function Choice({ to, onClick, tone, title, text, big }: { to?: string; onClick?: () => void; tone: Tone; title: string; text: string; big?: boolean }) {
  const inner = (
    <>
      <Ph tone={tone} />
      <span className="t"><b>{title}</b><span>{text}</span></span>
      {big ? <span className="btn btn--s btn--gray r1-go">Выбрать</span> : <Icon name="right" />}
    </>
  );
  if (to) return <Link className={`r1-choice ${big ? 'r1-big' : ''}`} to={to}>{inner}</Link>;
  return <button type="button" className={`r1-choice ${big ? 'r1-big' : ''}`} onClick={onClick} style={{ border: 0, cursor: 'pointer', font: 'inherit' }}>{inner}</button>;
}

export default function Role() {
  const phone = usePhone();
  const { askLogin } = useApp();
  return (
    <Page title="Регистрация" back="/" mTitle="Регистрация" right={<Btn size="s" v="white" onClick={() => askLogin()}>Войти</Btn>}>
      <div className="r1-onb" style={{ maxWidth: 760, paddingTop: phone ? 0 : 16 }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <h1 className={phone ? 'h2' : 'h1'}>Как вы будете пользоваться TopRepet?</h1>
          <p className="sub">Выберите один вариант. Поменять его потом нельзя: для второй роли нужен отдельный аккаунт.</p>
        </div>
        <div className={phone ? 'cols' : 'cols half'} style={{ gap: 12 }}>
          <Choice to="/signup/student" tone="teal" title="Хочу учиться" text="Найти репетитора или опубликовать заявку" big={!phone} />
          <Choice to="/signup/tutor" tone="orange" title="Хочу преподавать" text="Создать анкету, открыть расписание, получать учеников" big={!phone} />
        </div>
        <Note tone="action" icon="info">Уже учитесь у нас и хотите преподавать? Зарегистрируйтесь ещё раз с другой почтой.</Note>
        {!phone && <div className="between" style={{ justifyContent: 'center' }}><span className="small">Уже есть аккаунт?</span><Btn size="s" v="white" onClick={() => askLogin()}>Войти</Btn></div>}
      </div>
    </Page>
  );
}
