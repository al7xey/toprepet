import { Navigate, useParams } from 'react-router-dom';

/* Old direction addresses lead to the catalog with the same goal or subject (Р-6: /lessons/ is gone). */
const CATALOG: Record<string, string> = {
  'school-start': 'goal=preschool',
  primary: 'subject=primary',
  'school-program': 'goal=school',
  subjects: 'goal=school',
  homework: 'goal=homework',
  oge: 'goal=oge',
  ege: 'goal=ege',
};

export default function DirectionPage() {
  const { id } = useParams();
  const query = id && Object.hasOwn(CATALOG, id) ? CATALOG[id] : undefined;
  if (query) return <Navigate to={`/teachers/?${query}`} replace />;
  return (
    <section className="not-found container">
      <p>404</p>
      <h1>Страница не найдена</h1>
    </section>
  );
}
