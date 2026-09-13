import { ArrowLeft, Camera, Check, MessageCircle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { findTeacher } from '../../entities/teacher';
import { TELEGRAM_URL } from '../../shared/config/site';

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
          <Camera size={28} strokeWidth={1.7} aria-hidden="true" />
          <span>Фото готовится</span>
        </div>
        <div className="teacher-profile-copy">
          <p className="teacher-profile-placeholder">Пример анкеты — данные преподавателя уточняются</p>
          <h1 id="teacher-name">{teacher.name}</h1>
          <p className="teacher-profile-role">{teacher.role}</p>
          <div className="teacher-subject-list" aria-label="Предметы">
            {teacher.subjects.map((subject) => (
              <span key={subject}>{subject}</span>
            ))}
          </div>
          <p>{teacher.intro}</p>
          <ul className="teacher-achievements">
            {teacher.achievements.map((achievement) => (
              <li key={achievement}>
                <Check size={19} aria-hidden="true" />
                <span>{achievement}</span>
              </li>
            ))}
          </ul>
          <a
            className="button button-primary teacher-profile-contact"
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={19} aria-hidden="true" />
            Написать в Telegram
          </a>
        </div>
      </div>
    </section>
  );
}
