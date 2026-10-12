import { MAIL_API_URL } from './config';

/* Local mail catcher (Mailpit API of `supabase start`), used only by /dev/mail. */

export interface MailSummary {
  ID: string;
  Subject: string;
  To: { Address: string }[];
  Created: string;
}

export interface MailMessage extends MailSummary {
  HTML: string;
  Text: string;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${MAIL_API_URL}/api/v1/${path}`);
  if (!res.ok) throw new Error(`mail api ${res.status}`);
  return (await res.json()) as T;
}

export async function listMail(): Promise<MailSummary[]> {
  const data = await get<{ messages?: MailSummary[] }>('messages');
  return [...(data.messages ?? [])].sort((a, b) => b.Created.localeCompare(a.Created));
}

export const getMail = (id: string) => get<MailMessage>(`message/${encodeURIComponent(id)}`);

/* Letters queued in email_outbox, rendered by the dev and preview server (service/dev-outbox.ts); the Edge Function sends the same ones. */
export interface OutboxLetter {
  id: number;
  to: string;
  template: string;
  subject: string;
  html: string;
  createdAt: string;
  sentAt: string | null;
}

async function outbox(query = ''): Promise<OutboxLetter[]> {
  const res = await fetch(`/__dev/outbox${query}`);
  if (!res.ok) throw new Error(`outbox ${res.status}`);
  return (await res.json()) as OutboxLetter[];
}

export const listOutbox = () => outbox();
export const getOutboxLetter = async (id: number) => (await outbox(`?id=${id}`))[0] ?? null;

/** One list for /dev/mail: Auth letters from the mail catcher and the service's letters from the outbox, newest first. */
export interface DevLetter {
  key: string;
  subject: string;
  to: string;
  at: number;
  queued: boolean;
}

export async function listDevMail(): Promise<DevLetter[]> {
  const [auth, queued] = await Promise.all([listMail().catch(() => [] as MailSummary[]), listOutbox()]);
  return [
    ...auth.map(m => ({ key: `m${m.ID}`, subject: m.Subject, to: m.To.map(t => t.Address).join(', '), at: Date.parse(m.Created), queued: false })),
    ...queued.map(l => ({ key: `o${l.id}`, subject: l.subject, to: l.to, at: Date.parse(l.createdAt), queued: !l.sentAt })),
  ].sort((a, b) => b.at - a.at);
}
