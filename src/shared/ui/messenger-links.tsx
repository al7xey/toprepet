import { MessageCircle, Phone, Send } from 'lucide-react';
import { useState, type MouseEvent } from 'react';
import { enquiryMessage } from '../config/site';
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
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const message = enquiryMessage(topic);
  async function prepareMessage(event: MouseEvent<HTMLAnchorElement>, id: MessengerId) {
    if (id !== 'vk' && id !== 'max') return;
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const url = event.currentTarget.href;
    try {
      await navigator.clipboard.writeText(message);
      setCopyState('copied');
      // Same-tab navigation after the copy avoids popup blockers and copying races.
      window.location.assign(url);
    } catch {
      setCopyState('failed');
    }
  }
  return (
    <>
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
          onClick={(event) => void prepareMessage(event, messenger.id)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${messenger.label} — диалог с менеджером`}
        >
          <MessengerIcon id={messenger.id} />
          <span>{messenger.label}</span>
        </a>
      ))}
    </div>
    <output className="messenger-copy-feedback">
      {copyState === 'copied' && 'Сообщение скопировано. Вставьте его в диалог с менеджером.'}
      {copyState === 'failed' && <>
        <p>Браузер не разрешил копирование. Выделите и скопируйте сообщение, затем откройте мессенджер.</p>
        <textarea aria-label="Сообщение менеджеру" value={message} readOnly rows={6} onFocus={(event) => event.currentTarget.select()} />
        <div className="messenger-fallback-links">
          {messengers.filter((item) => item.id === 'vk' || item.id === 'max').map((item) => <a key={item.id} className="inline-link" href={item.url} target="_blank" rel="noopener noreferrer">Открыть {item.label}</a>)}
        </div>
      </>}
    </output>
    </>
  );
}
