import { MessageCircle, Phone, Send } from 'lucide-react';
import {
  messengers,
  messengerLink,
  type MessengerId,
} from '../config/contacts';

function MessengerIcon({ id }: { id: MessengerId }) {
  if (id === 'telegram') return <Send size={22} aria-hidden="true" />;
  if (id === 'whatsapp') return <Phone size={22} aria-hidden="true" />;
  if (id === 'vk')
    return (
      <span className="messenger-wordmark" aria-hidden="true">
        vk
      </span>
    );
  return <MessageCircle size={22} aria-hidden="true" />;
}

export function MessengerLinks({
  topic,
  className = '',
  linkClassName = '',
}: {
  topic?: string;
  className?: string;
  linkClassName?: string;
}) {
  return (
    <div
      className={'messenger-grid' + (className ? ' ' + className : '')}
      aria-label="Мессенджеры для связи"
    >
      {messengers.map((messenger) => (
        <a
          key={messenger.id}
          className={
            'messenger-button' + (linkClassName ? ' ' + linkClassName : '')
          }
          href={messengerLink(messenger, topic)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${messenger.label} — диалог с менеджером`}
        >
          <MessengerIcon id={messenger.id} />
          <span>{messenger.label}</span>
        </a>
      ))}
    </div>
  );
}
