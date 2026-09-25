import { Link, Navigate, useParams } from 'react-router-dom';
import { legacyGoal } from '../../entities/lesson';
export default function DirectionPage() {
  const { id } = useParams();
  const goal = id && Object.hasOwn(legacyGoal, id) ? legacyGoal[id] : undefined;
  if (goal) {
    const params = new URLSearchParams({ goal });
    if (id === 'ege') params.set('exam', 'ЕГЭ');
    if (id === 'oge') params.set('exam', 'ОГЭ');
    if (id === 'school-start') params.set('subject', 'Подготовка к школе');
    if (id === 'primary') params.set('subject', 'Начальные классы');
    return <Navigate to={'/lessons/?' + params} replace />;
  }
  return (
    <section className="not-found container">
      <p>404</p>
      <h1>Страница не найдена</h1>
      <Link to="/" className="button button-primary">
        На главную
      </Link>
    </section>
  );
}
