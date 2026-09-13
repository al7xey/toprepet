import { ArrowLeft, MessageCircle, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Contact } from '../../widgets/contact/contact';

export default function TeacherJoinPage() {
  return (
    <>
      <section className="teacher-join container" aria-labelledby="teacher-join-title">
        <Link className="teacher-back" to="/#teachers">
          <ArrowLeft size={19} aria-hidden="true" />
          Все преподаватели
        </Link>
        <div className="teacher-join-card">
          <span className="teacher-join-icon" aria-hidden="true"><Sparkles size={24} /></span>
          <p className="eyebrow">Ищем топ репетов</p>
          <h1 id="teacher-join-title">Ваше фото может быть здесь</h1>
          <p>Приглашаем молодых преподавателей английского, информатики и других школьных предметов.</p>
          <p>Напишите менеджеру — расскажем о формате, ответим на вопросы и договоримся о знакомстве.</p>
          <a className="button button-primary" href="https://t.me/a17xey" target="_blank" rel="noopener noreferrer">
            <MessageCircle size={19} aria-hidden="true" />
            Написать менеджеру
          </a>
        </div>
      </section>
      <Contact />
    </>
  );
}
