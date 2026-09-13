import { TELEGRAM_URL, telegramLink, enquiryMessage } from './site';

export const MANAGER_PHONE = '+7 917 196-68-93';
export const MANAGER_PHONE_DIGITS = '79171966893';

export type MessengerId = 'telegram' | 'whatsapp' | 'vk' | 'max';
export interface Messenger {
  id: MessengerId;
  label: string;
  url: string;
}

// Only verified direct manager links belong here; platform homepages are not contacts.
export const messengers: readonly Messenger[] = [
  { id: 'telegram', label: 'Telegram', url: TELEGRAM_URL },
  { id: 'whatsapp', label: 'WhatsApp', url: `https://wa.me/${MANAGER_PHONE_DIGITS}` },
  { id: 'vk', label: 'VK', url: 'https://vk.me/sem7nov' },
  { id: 'max', label: 'MAX', url: 'https://max.ru/u/f9LHodD0cOJRyEC2Ro2ofdI5tFLdDfCd3RfteHmJFNNyfNgr7yJEFsBNQOQ' },
];

export function messengerLink(messenger: Messenger, topic?: string) {
  if (messenger.id === 'telegram') return telegramLink(topic || 'Бесплатное знакомство на 20 минут');
  if (messenger.id === 'whatsapp') return `${messenger.url}?text=${encodeURIComponent(enquiryMessage(topic))}`;
  return messenger.url;
}
