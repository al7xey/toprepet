import type { Api } from './contract';
import { createHttpApi } from './http';
import { createMockApi } from './mock';

const base = import.meta.env.VITE_API_URL as string | undefined;

/** Единая точка доступа к данным. Без VITE_API_URL работает моковый бэкенд в браузере. */
export const api: Api = base ? createHttpApi(base.replace(/\/$/, '')) : createMockApi();

export { ApiError } from './contract';
export type { Api } from './contract';
export * from './types';
export { staticTutors, studentPriceOf } from './mock';
