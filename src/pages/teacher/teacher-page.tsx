import { ArrowLeft, MessageCircle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { findTeacher } from '../../entities/teacher';
import { telegramLink } from '../../shared/config/site';

export default function TeacherPage() {
  const { id } = useParams();
  const teacher = findTeacher(id);

  if (!teacher) {
    return (
      <section className="not-found container">
        <p>404</p>
        <h1>Анкета не найдена</h1>
        <Link to="/#teachers" className="button button-primary">
          К преподавателям
        </Link>
      </section>
    );
  }

  return (
    <section className="teacher-profile container" aria-labelledby="teacher-name">
      <Link className="teacher-back" to="/#teachers">
        <ArrowLeft size={19} aria-hidden="true" />
        Все преподаватели
      </Link>
      <div className="teacher-profile-grid">
        <div className="teacher-profile-photo">
          <img src={teacher.photo} alt={`Фото: ${teacher.name}`} />
        </div>
        <div className="teacher-profile-copy">
          <h1 id="teacher-name">{teacher.name}</h1>
          <p className="teacher-profile-intro">{teacher.intro}</p>

          <section className="teacher-profile-section" aria-labelledby="teacher-topics">
            <h2 id="teacher-topics">С чем поможет</h2>
            <div className="teacher-topic-grid">
              {teacher.cardTicker.map((topic) => <span key={topic}>{topic}</span>)}
            </div>
          </section>

          <section className="teacher-profile-section teacher-profile-approach" aria-labelledby="teacher-approach">
            <h2 id="teacher-approach">Как проходят занятия</h2>
            <p>{teacher.approach}</p>
          </section>

          <div className="teacher-profile-action">
            <div>
              <strong>Хотите заниматься с этим преподавателем?</strong>
              <span>Менеджер уточнит расписание и поможет записаться.</span>
            </div>
            <a
              className="button button-primary teacher-profile-contact"
              href={telegramLink(`Хочу выбрать преподавателя: ${teacher.name}`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={19} aria-hidden="true" />
              Выбрать через менеджера
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
