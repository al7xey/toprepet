/* Dev and e2e only: /__dev/outbox serves letters queued in public.email_outbox, rendered by the same module as the
   send-email Edge Function, so /dev/mail shows them without an Edge runtime (О2). Runs inside the Vite dev and preview
   servers, never in the browser bundle; the service role key comes from SUPABASE_SERVICE_ROLE_KEY or is signed with the
   local `supabase start` JWT secret. */
import { createHmac } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { html, letter, LETTER_SELECT, toLetterBooking, type OutboxRow } from '../supabase/functions/send-email/letters';

const LOCAL_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';

function serviceKey() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return process.env.SUPABASE_SERVICE_ROLE_KEY;
  const part = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const body = `${part({ alg: 'HS256', typ: 'JWT' })}.${part({ iss: 'supabase-demo', role: 'service_role', exp: 1983812996 })}`;
  const sig = createHmac('sha256', process.env.SUPABASE_JWT_SECRET ?? LOCAL_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

interface Row extends OutboxRow {
  created_at: string;
  sent_at: string | null;
}

export interface OutboxLetter {
  id: number;
  to: string;
  template: string;
  subject: string;
  html: string;
  createdAt: string;
  sentAt: string | null;
}

async function outbox(api: string, site: string, id: number | null): Promise<OutboxLetter[]> {
  const key = serviceKey();
  const headers = { apikey: key, authorization: `Bearer ${key}` };
  const q = new URLSearchParams({ select: 'id,to_email,template,payload,created_at,sent_at', order: 'id.desc', limit: '100' });
  if (id) q.set('id', `eq.${id}`);
  const res = await fetch(`${api}/rest/v1/email_outbox?${q}`, { headers });
  if (!res.ok) throw new Error(`outbox ${res.status}: ${await res.text()}`);
  const rows = (await res.json()) as Row[];
  const ids = [...new Set(rows.map(r => Number(r.payload.booking_id)).filter(Number.isFinite))];
  const bookings = new Map<number, Record<string, unknown>>();
  if (ids.length) {
    const bq = new URLSearchParams({ select: LETTER_SELECT, id: `in.(${ids.join(',')})` });
    const br = await fetch(`${api}/rest/v1/bookings?${bq}`, { headers });
    if (!br.ok) throw new Error(`bookings ${br.status}: ${await br.text()}`);
    for (const b of (await br.json()) as Record<string, unknown>[]) bookings.set(Number(b.id), b);
  }
  return rows.flatMap(r => {
    const b = bookings.get(Number(r.payload.booking_id));
    const l = b ? letter(r, toLetterBooking(b), site) : null;
    if (!l) return [];
    return [{ id: r.id, to: r.to_email, template: r.template, subject: l.subject, html: html(l, r.to_email), createdAt: r.created_at, sentAt: r.sent_at }];
  });
}

export function devOutbox({ api }: { api: string }): Plugin {
  const handle = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = new URL(req.url ?? '', 'http://local');
    if (url.pathname !== '/__dev/outbox') return next();
    const id = Number(url.searchParams.get('id')) || null;
    // links in the letters lead to the server that shows them
    const site = `http://${req.headers.host ?? '127.0.0.1:5180'}`;
    outbox(api, site, id).then(
      list => {
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(list));
      },
      (e: unknown) => {
        res.statusCode = 502;
        res.end(JSON.stringify({ error: String(e) }));
      },
    );
  };
  return {
    name: 'toprepet-dev-outbox',
    configureServer: server => void server.middlewares.use(handle),
    configurePreviewServer: server => void server.middlewares.use(handle),
  };
}
