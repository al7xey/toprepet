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
