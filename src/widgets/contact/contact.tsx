import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { type LessonSelection, selectionDescription } from '../../entities/lesson';
import { enquiryMessage } from '../../shared/config/site';
import { MessengerLinks } from '../../shared/ui/messenger-links';

export function Contact({ onLessonsPage = false, standalone = false }: { onLessonsPage?: boolean; standalone?: boolean }) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const selection = useSelector((state: { lesson: LessonSelection }) => state.lesson);
  const hasSelection = Boolean(selection.subject || selection.grade || selection.promoCode || selection.goal !== 'subject');
  const topic = hasSelection ? selectionDescription(selection) : undefined;

  async function copySelection() {
    try {
      await navigator.clipboard.writeText(enquiryMessage(topic));
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  }
  return (
    <section id="contact" className={'contact-section container' + (standalone ? ' standalone-contact' : '')} aria-labelledby="contact-title">
      {standalone && <Link className="back-link" to="/">На главную</Link>}
      <div className={'contact-heading' + (standalone ? ' page-heading' : '')}>
        {standalone ? <h1 id="contact-title">Напишите менеджеру</h1> : <h2 id="contact-title">Начните занятия</h2>}
        <p>{standalone ? 'Задайте вопрос о занятиях, выберите преподавателя или согласуйте время бесплатного знакомства. Свяжитесь с нами в удобном мессенджере.' : 'Выберите удобный мессенджер и напишите нам. Менеджер поможет с выбором занятия и преподавателя.'}</p>
        <p><strong>Среднее время ответа — 7 минут.</strong></p>
      </div>
      <div className="contact-actions">
        <MessengerLinks topic={topic} />
        {hasSelection && <div className="contact-selection">
          <p>В Telegram и WhatsApp сообщение уже заполнено. При нажатии на VK или MAX текст копируется — останется вставить его в диалог.</p>
          <button type="button" className="copy-choice" onClick={copySelection}>{copyState === 'copied' ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}Скопировать выбор</button>
          {!onLessonsPage && <Link className="inline-link" to="/lessons">Изменить</Link>}
          <output className="copy-status">{copyState === 'copied' ? 'Текст скопирован — вставьте его в диалог' : copyState === 'failed' ? 'Скопируйте текст из поля ниже' : ''}</output>
          {copyState === 'failed' && <textarea aria-label="Текст сообщения для ручного копирования" value={enquiryMessage(topic)} readOnly rows={7} />}
        </div>}
      </div>
    </section>
  );
}
