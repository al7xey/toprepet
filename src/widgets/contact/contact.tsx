import { MessageCircle, Phone, Send, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { type LessonSelection, selectionDescription } from '../../entities/lesson';
import { messengers, messengerLink, type MessengerId } from '../../shared/config/contacts';
import { enquiryMessage } from '../../shared/config/site';

function MessengerIcon({ id }: { id: MessengerId }) {
  if (id === 'telegram') return <Send size={22} aria-hidden="true" />;
  if (id === 'whatsapp') return <Phone size={22} aria-hidden="true" />;
  if (id === 'vk') return <span className="messenger-wordmark" aria-hidden="true">vk</span>;
  return <MessageCircle size={22} aria-hidden="true" />;
}

export function Contact({ onLessonsPage = false }: { onLessonsPage?: boolean }) {
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
    <section id="contact" className="contact-section container" aria-labelledby="contact-title">
      <div className="contact-heading">
        <h2 id="contact-title">Связаться с менеджером</h2>
        <p>Выберите удобный мессенджер. Пока сайт развивается, менеджер поможет подобрать занятия — обычно отвечаем за 7 минут.</p>
      </div>
      <div className="contact-actions">
        <div className="messenger-grid" aria-label="Мессенджеры для связи">
          {messengers.map((messenger) => {
            const href = messengerLink(messenger, topic);
            return (
              <a key={messenger.id} className="messenger-button" href={href} target="_blank" rel="noopener noreferrer" aria-label={`${messenger.label} — диалог с менеджером`}><MessengerIcon id={messenger.id} /><span>{messenger.label}</span></a>
            );
          })}
        </div>
        {hasSelection && <div className="contact-selection">
          <p>Для Telegram и WhatsApp выбор{selection.promoCode.trim() ? ' и промокод' : ''} уже добавлен в сообщение. Для VK и MAX скопируйте текст.</p>
          <button type="button" className="copy-choice" onClick={copySelection}>{copyState === 'copied' ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}Скопировать выбор</button>
          {!onLessonsPage && <Link className="inline-link" to="/lessons">Изменить</Link>}
          <p className="copy-status" role="status">{copyState === 'copied' ? 'Текст скопирован — вставьте его в диалог' : copyState === 'failed' ? 'Скопируйте текст из поля ниже' : ''}</p>
          {copyState === 'failed' && <textarea aria-label="Текст сообщения для ручного копирования" value={enquiryMessage(topic)} readOnly rows={7} />}
        </div>}
      </div>
    </section>
  );
}
