import { optimizeImage } from '../lib/images';
import { ApiError, type Api } from './contract';

/** Реальный клиент: включается, когда задан VITE_API_URL. Сессия — в httpOnly cookie, поэтому credentials: 'include'. */
/** `fetchImpl` нужен тестам в Node (там нет cookie-хранилища браузера); в приложении используется обычный fetch. */
export function createHttpApi(base: string, fetchImpl: typeof fetch = (...args) => fetch(...args)): Api {
  const request = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
    const isForm = body instanceof FormData;
    const response = await fetchImpl(`${base}${path}`, {
      method,
      credentials: 'include',
      headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
    if (response.status === 204) return undefined as T;
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new ApiError(data?.message ?? 'Не удалось выполнить запрос. Попробуйте ещё раз.', response.status, data?.code);
    return data as T;
  };
  const get = <T>(path: string) => request<T>('GET', path);
  const post = <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {});
  const q = (params: Record<string, unknown>) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== '') search.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value as string | number | boolean));
    const text = search.toString();
    return text ? `?${text}` : '';
  };

  return {
    mode: 'http',
    me: async () => { try { return await get('/auth/me'); } catch (error) { if (error instanceof ApiError && error.status === 401) return null; throw error; } },
    login: (email, password) => post('/auth/login', { email, password }),
    loginWithYandex: () => post('/auth/yandex'),
    signup: (input) => post('/auth/signup', input),
    logout: () => post('/auth/logout'),
    requestPasswordReset: (email) => post('/auth/password-reset', { email }),
    confirmPasswordReset: (token, password) => post('/auth/password-reset/confirm', { token, password }),
    resendVerification: () => post('/auth/verify/resend'),
    verifyEmail: (token) => post('/auth/verify', { token }),
    completeOnboarding: (input) => post('/me/onboarding', input),
    updateMe: (input) => request('PATCH', '/me', input),
    uploadMyPhoto: async (file) => { const form = new FormData(); form.set('file', await optimizeImage(file)); return post('/me/photo', form); },
    changePassword: async (input) => { await post('/me/password', input); },

    listTutors: (filter) => get(`/tutors${q({ ...filter })}`),
    getTutor: (id) => get(`/tutors/${id}`),
    getTutorSlots: (id, from, days) => get(`/tutors/${id}/slots${q({ from, days })}`),
    getTutorReviews: (id) => get(`/tutors/${id}/reviews`),

    createBooking: (input) => post('/bookings', input),
    listLessons: (scope) => get(`/me/lessons${q({ scope })}`),
    getLesson: (id) => get(`/lessons/${id}`),
    cancelLesson: (id, reason) => post(`/lessons/${id}/cancel`, { reason }),
    proposeMove: (id, start) => post(`/lessons/${id}/move`, { start }),
    answerMove: (id, accept) => post(`/lessons/${id}/move/answer`, { accept }),
    confirmLesson: (id) => post(`/lessons/${id}/confirm`),
    declineLesson: (id, reason) => post(`/lessons/${id}/decline`, { reason }),
    markLessonResult: (id, result) => post(`/lessons/${id}/result`, { result }),
    reportProblem: (input) => post(`/lessons/${input.lessonId}/problem`, input),
    getDispute: (id) => get(`/disputes/${id}`),
    replyDispute: (id, text) => post(`/disputes/${id}/reply`, { text }),

    createReview: (lessonId, rating, text) => post(`/lessons/${lessonId}/review`, { rating, text }),
    getReview: (id) => get(`/reviews/${id}`),
    listMyReviews: () => get('/me/reviews'),
    replyReview: (id, text) => post(`/reviews/${id}/reply`, { text }),

    listMyRequests: () => get('/me/requests'),
    createRequest: (input) => post('/requests', input),
    getRequest: (id) => get(`/requests/${id}`),
    closeRequest: (id) => post(`/requests/${id}/close`),
    listResponses: (id) => get(`/requests/${id}/responses`),
    listOpenRequests: (subject) => get(`/requests${q({ status: 'open', subject })}`),
    respondToRequest: (id, input) => post(`/requests/${id}/responses`, input),
    listMyResponses: () => get('/me/responses'),

    listConversations: () => get('/me/conversations'),
    openConversation: (tutorId) => post('/conversations', { tutorId }),
    getConversation: (id) => get(`/conversations/${id}`),
    listMessages: (id) => get(`/conversations/${id}/messages`),
    sendMessage: (id, text) => post(`/conversations/${id}/messages`, { text }),
    sendPhoto: async (id, file, caption) => { const form = new FormData(); form.set('file', await optimizeImage(file)); if (caption) form.set('text', caption); return post(`/conversations/${id}/messages`, form); },
    deleteMessage: (id, messageId) => request('DELETE', `/conversations/${id}/messages/${messageId}`),
    reportConversation: (id, reason, block) => post(`/conversations/${id}/report`, { reason, block }),

    listPayments: () => get('/me/payments'),
    listCards: () => get('/me/cards'),
    addCard: (input) => post('/me/cards', input),
    removeCard: (id) => request('DELETE', `/me/cards/${id}`),
    getFinance: () => get('/tutor/finance'),
    getPayoutSettings: () => get('/tutor/payout'),
    savePayoutSettings: (input) => request('PUT', '/tutor/payout', input),

    listNotifications: () => get('/me/notifications'),
    markNotificationsRead: () => post('/me/notifications/read'),
    markNotificationRead: (id) => post(`/me/notifications/${id}/read`),

    getMyProfile: () => get('/tutor/profile'),
    saveMyProfile: (patch) => request('PATCH', '/tutor/profile', patch),
    submitMyProfile: () => post('/tutor/profile/submit'),
    getWeek: () => get('/tutor/schedule'),
    saveWeek: (week) => request('PUT', '/tutor/schedule', week),
    listExceptions: () => get('/tutor/schedule/exceptions'),
    saveException: (item) => request('PUT', `/tutor/schedule/exceptions/${item.date}`, item),
    deleteException: (date) => request('DELETE', `/tutor/schedule/exceptions/${date}`),
    uploadPhoto: async (file) => { const form = new FormData(); form.set('file', await optimizeImage(file)); return post('/tutor/photo', form); },
    listDocuments: () => get('/tutor/documents'),
    uploadDocument: (title, file) => { const form = new FormData(); form.set('title', title); form.set('file', file); return post('/tutor/documents', form); },
    listMyStudents: () => get('/tutor/students'),
    listMyTutors: () => get('/me/tutors'),

    adminCancellations: () => get('/admin/cancellations'),
    adminDisputes: () => get('/admin/disputes'),
    adminResolveDispute: (id, outcome) => post(`/admin/disputes/${id}/resolve`, { outcome }),
    adminReviewQueue: () => get('/admin/reviews'),
    adminModerateReview: (id, approve) => post(`/admin/reviews/${id}`, { approve }),
    adminProfileQueue: () => get('/admin/profiles'),
    adminModerateProfile: (tutorId, approve, note) => post(`/admin/profiles/${tutorId}`, { approve, note }),
  };
}
