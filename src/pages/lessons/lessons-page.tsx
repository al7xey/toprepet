import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LessonPicker } from '../../features/select-lesson';
import { isGoal } from '../../entities/lesson';
export default function LessonsPage() {
  const [params] = useSearchParams();
  const value = params.get('goal');
  const goal = isGoal(value) ? value : 'subject';
  useEffect(() => {
    document.title = 'Выбрать занятия — TopRepet';
    return () => {
      document.title = 'TopRepet — учиться с поддержкой';
    };
  }, []);
  return (
    <section className="lessons-page container">
      <Link to="/" className="back-link">
        На главную
      </Link>
      <header className="page-heading">
        <h1>Занятия для вашего ребёнка</h1>
        <p>Выберите предмет и цель, затем напишите нам в Telegram.</p>
      </header>
      <LessonPicker
        initialGoal={goal}
        initialSubject={params.get('subject') || ''}
        initialExam={params.get('exam') || ''}
      />
    </section>
  );
}
