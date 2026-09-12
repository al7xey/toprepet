import { ArrowUpRight, Clock3, MessageCircle, Users } from 'lucide-react';
import { managerContacts } from '../../shared/config/site';

const icons = {
  telegram: MessageCircle,
  whatsapp: MessageCircle,
  vk: Users,
  max: MessageCircle,
} as const;

export function ManagerContact() {
  return (
    <section className="manager-contact section container" id="manager-contact" aria-labelledby="manager-title">
      <div className="manager-contact-copy">
        <p className="eyebrow">Мы на связи</p>
        <h2 id="manager-title">Сайт ещё развивается — менеджер уже отвечает.</h2>
        <p>
          Чтобы не потерять вас, переходите сразу в диалог. Подскажем по занятиям,
          преподавателям и свободному времени.
        </p>
        <div className="manager-response"><Clock3 size={19} aria-hidden="true" /> Среднее время ответа — 7 минут</div>
      </div>
      <div className="manager-contact-panel">
        <div className="manager-contact-label">Выберите удобный мессенджер</div>
        <div className="manager-links">
          {managerContacts.map(({ id, label, href, available }) => {
            const Icon = icons[id];
            return (
              <a
                className={`manager-link${available ? '' : ' is-pending'}`}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                key={id}
              >
                <span className="manager-link-icon"><Icon size={21} aria-hidden="true" /></span>
                <span><strong>{label}</strong><small>{available ? 'Диалог с менеджером' : 'Ссылка подключается'}</small></span>
                <ArrowUpRight size={19} aria-hidden="true" />
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
