import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LessonPicker } from '../../features/select-lesson';
import { isGoal } from '../../entities/lesson';
import { Contact } from '../../widgets/contact/contact';
import { useScrollToSection } from '../../shared/lib/use-scroll-to-section';
export default function LessonsPage() {
  useScrollToSection();
  const [params] = useSearchParams();
  const value = params.get('goal');
  const goal = isGoal(value) ? value : undefined;
  useEffect(() => {
    document.title = 'Выбрать занятия — TopRepet';
    return () => {
      document.title = 'TopRepet — любое занятие за 1 200 ₽';
    };
  }, []);
  return (
    <>
    <section className="lessons-page container">
      <Link to="/" className="back-link">
        На главную
      </Link>
      <header className="page-heading">
        <h1>Какие занятия нужны?</h1>
        <p>Выберите цель, предмет и класс. Мы добавим выбранные параметры и промокод в сообщение менеджеру.</p>
      </header>
      <LessonPicker
        initialGoal={goal}
        initialSubject={params.get('subject') || ''}
        initialExam={params.get('exam') || ''}
      />
    </section>
    <Contact onLessonsPage />
    </>
  );
}
