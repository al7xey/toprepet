import { ScreenView } from '../../new-design/screen';
import d from '../../new-design/screens/tutors.d.html?raw';
import m from '../../new-design/screens/tutors.m.html?raw';

/** Страница для репетиторов по макету (ветка design/home-mockup). */
export default function ForTutorsPage() {
  return <ScreenView d={d} m={m} />;
}
