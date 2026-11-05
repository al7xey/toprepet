import type { Api } from './contract';
import { createHttpApi } from './http';
import { createMockApi } from './mock';

const base = import.meta.env.VITE_API_URL as string | undefined;
const demo = import.meta.env.DEV || import.meta.env.MODE === 'demo' || import.meta.env.VITE_API_MODE === 'demo';
if (!base && !demo) throw new Error('API URL is required outside demo mode');

/** Единая точка доступа к данным. Без VITE_API_URL работает моковый бэкенд в браузере. */
export const api: Api = base ? createHttpApi(base.replace(/\/$/, '')) : createMockApi();

export { ApiError } from './contract';
export type { Api } from './contract';
export * from './types';
export { staticTutors, studentPriceOf } from './mock';
