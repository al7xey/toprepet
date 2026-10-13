import { Page } from '../../ui/layout';
import { Btn, Empty } from '../../ui/kit';
import { TeacherGrid, catalogItem } from '../../ui/domain';
import { usePhone } from '../../ui/hooks';
import { useDb, useSession, tutorById, tutors as tApi } from '../../api';
import type { TutorProfile } from '../../api/types';
import { countLabel } from '../../lib/time';

export default function Favorites() {
  const d = useDb();
  const me = useSession()!;
  const phone = usePhone();
  const list = me.favorites.map(id => tutorById(d, id)).filter((t): t is TutorProfile => !!t);
  const hidden = list.filter(t => !tApi.isListed(t)).length;
  const items = list.map(t => catalogItem(d, t));
  const line = `${countLabel(list.length, 'репетитор', 'репетитора', 'репетиторов')}. Сердечко убирает из списка.${hidden ? ` ${hidden} сейчас на паузе.` : ''}`;
  const body = list.length ? <TeacherGrid items={items} /> : <Empty icon="heart" title="В избранном пока никого" style={{ maxWidth: 'none' }} action={<Btn v="primary" to="/teachers">Найти репетитора</Btn>}>Нажмите сердечко на карточке репетитора, чтобы вернуться к нему позже.</Empty>;
  if (phone)
    return (
      <Page title="Избранное" back="/account">
        {list.length > 0 && <span className="small">{line}</span>}
        {body}
        {list.length > 0 && <Btn block to="/teachers">Найти ещё</Btn>}
      </Page>
    );
  return (
    <Page title="Избранное" kind="cabinet" side="Избранное">
      <div className="between"><div className="title-block"><h1 className="h1">Избранное</h1>{list.length > 0 && <span className="sub">{line}</span>}</div>{list.length > 0 && <Btn to="/teachers">Найти ещё</Btn>}</div>
      {body}
    </Page>
  );
}
