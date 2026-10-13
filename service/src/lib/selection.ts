/* The lesson a visitor picked on a profile: subject, length and start travel in the address,
   so login, sign-up and the booking form come back to the same slot (У2.1-вход, У3.1). */

export interface Selection {
  subject: string | null;
  dur: number | null;
  slot: number | null;
}

export function parseSelection(params: URLSearchParams): Selection {
  const dur = Number(params.get('dur'));
  const slot = Date.parse(params.get('slot') ?? '');
  return {
    subject: /^[a-z-]{2,30}$/.test(params.get('subject') ?? '') ? params.get('subject') : null,
    dur: [45, 60, 90, 120].includes(dur) ? dur : null,
    slot: Number.isFinite(slot) ? slot : null,
  };
}

/** «?subject=math&dur=60&slot=2026-10-16T16:00:00.000Z»; empty parts are left out. */
export function selectionQuery(s: Selection) {
  const p = new URLSearchParams();
  if (s.subject) p.set('subject', s.subject);
  if (s.dur) p.set('dur', String(s.dur));
  if (s.slot !== null) p.set('slot', new Date(s.slot).toISOString());
  const q = p.toString();
  return q ? `?${q}` : '';
}
