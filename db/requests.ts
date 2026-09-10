import { env } from 'cloudflare:workers';
export function getRequestDb() { if(!env.DB) throw new Error('Database unavailable'); return env.DB; }
