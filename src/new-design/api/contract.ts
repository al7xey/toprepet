import type {
  AdminCancellation, AdminProfile, Card, Conversation, CreateBookingInput, CreateRequestInput, Dispute, Finance, Id, IsoDate, Lesson,
  Message, Notification, Page, PaymentRecord, PayoutSettings, ProblemInput, RequestResponse, Review, Role, ScheduleException,
  Slot, StudentSummary, StudyRequest, Tutor, TutorDocument, TutorFilter, TutorProfileDraft, TutorSummary, User, WeekSchedule,
} from './types';

/**
 * Все обращения фронтенда к бэкенду. Сейчас работает мок (api/mock.ts), реальная реализация — api/http.ts.
 * Рядом с методом указан REST-адрес, по которому его ждёт http-клиент.
 */
export interface Api {
  mode: 'mock' | 'http';

  // Авторизация
  me(): Promise<User | null>; // GET /auth/me
  login(email: string, password: string): Promise<User>; // POST /auth/login
  loginWithYandex(): Promise<User>; // POST /auth/yandex
  signup(input: { role: Exclude<Role, 'admin'>; name: string; email: string; password: string }): Promise<User>; // POST /auth/signup
  logout(): Promise<void>; // POST /auth/logout
  requestPasswordReset(email: string): Promise<void>; // POST /auth/password-reset
  resendVerification(): Promise<void>; // POST /auth/verify/resend
  verifyEmail(token: string): Promise<User>; // POST /auth/verify (токен из письма)
  completeOnboarding(input: { forWhom: string; subjects: string[]; goal: string }): Promise<User>; // POST /me/onboarding
  updateMe(input: Partial<Pick<User, 'name' | 'timezone'>>): Promise<User>; // PATCH /me

  // Каталог и анкеты
  listTutors(filter: TutorFilter): Promise<Page<Tutor>>; // GET /tutors
  getTutor(id: Id): Promise<Tutor>; // GET /tutors/:id
  getTutorSlots(id: Id, from: IsoDate, days: number): Promise<Slot[]>; // GET /tutors/:id/slots
  getTutorReviews(id: Id): Promise<Review[]>; // GET /tutors/:id/reviews

  // Запись и уроки
  createBooking(input: CreateBookingInput): Promise<Lesson>; // POST /bookings
  listLessons(scope: 'upcoming' | 'past'): Promise<Lesson[]>; // GET /me/lessons?scope=
  getLesson(id: Id): Promise<Lesson>; // GET /lessons/:id
  cancelLesson(id: Id, reason: string): Promise<Lesson>; // POST /lessons/:id/cancel
  proposeMove(id: Id, start: IsoDate): Promise<Lesson>; // POST /lessons/:id/move
  answerMove(id: Id, accept: boolean): Promise<Lesson>; // POST /lessons/:id/move/answer
  confirmLesson(id: Id): Promise<Lesson>; // POST /lessons/:id/confirm (репетитор)
  declineLesson(id: Id, reason: string): Promise<Lesson>; // POST /lessons/:id/decline (репетитор)
  markLessonResult(id: Id, result: 'happened' | 'no_show_student' | 'no_show_tutor'): Promise<Lesson>; // POST /lessons/:id/result
  reportProblem(input: ProblemInput): Promise<Dispute>; // POST /lessons/:id/problem
  getDispute(id: Id): Promise<Dispute>; // GET /disputes/:id
  replyDispute(id: Id, text: string): Promise<Dispute>; // POST /disputes/:id/reply

  // Отзывы
  createReview(lessonId: Id, rating: number, text: string): Promise<Review>; // POST /lessons/:id/review
  getReview(id: Id): Promise<Review>; // GET /reviews/:id
  listMyReviews(): Promise<Review[]>; // GET /me/reviews (репетитор: отзывы о нём)
  replyReview(id: Id, text: string): Promise<Review>; // POST /reviews/:id/reply

  // Заявки
  listMyRequests(): Promise<StudyRequest[]>; // GET /me/requests
  createRequest(input: CreateRequestInput): Promise<StudyRequest>; // POST /requests
  getRequest(id: Id): Promise<StudyRequest>; // GET /requests/:id
  closeRequest(id: Id): Promise<StudyRequest>; // POST /requests/:id/close
  listResponses(requestId: Id): Promise<RequestResponse[]>; // GET /requests/:id/responses
  listOpenRequests(subject?: string | null): Promise<StudyRequest[]>; // GET /requests?status=open
  respondToRequest(requestId: Id, input: { price: number; message: string; slots: IsoDate[] }): Promise<RequestResponse>; // POST /requests/:id/responses
  listMyResponses(): Promise<(RequestResponse & { request: StudyRequest })[]>; // GET /me/responses

  // Сообщения
  listConversations(): Promise<Conversation[]>; // GET /me/conversations
  openConversation(tutorId: Id): Promise<Conversation>; // POST /conversations
  getConversation(id: Id): Promise<Conversation>; // GET /conversations/:id
  listMessages(id: Id): Promise<Message[]>; // GET /conversations/:id/messages
  sendMessage(id: Id, text: string): Promise<Message>; // POST /conversations/:id/messages
  reportConversation(id: Id, reason: string, block: boolean): Promise<void>; // POST /conversations/:id/report

  // Деньги
  listPayments(): Promise<PaymentRecord[]>; // GET /me/payments
  listCards(): Promise<Card[]>; // GET /me/cards
  addCard(input: { number: string; expiry: string; cvc: string }): Promise<Card>; // POST /me/cards (в проде — виджет провайдера)
  removeCard(id: Id): Promise<void>; // DELETE /me/cards/:id
  getFinance(): Promise<Finance>; // GET /tutor/finance
  getPayoutSettings(): Promise<PayoutSettings>; // GET /tutor/payout
  savePayoutSettings(input: { inn: string; cardNumber: string }): Promise<PayoutSettings>; // PUT /tutor/payout

  // Уведомления
  listNotifications(): Promise<Notification[]>; // GET /me/notifications
  markNotificationsRead(): Promise<void>; // POST /me/notifications/read

  // Кабинет репетитора
  getMyProfile(): Promise<TutorProfileDraft>; // GET /tutor/profile
  saveMyProfile(patch: Partial<TutorProfileDraft>): Promise<TutorProfileDraft>; // PATCH /tutor/profile
  submitMyProfile(): Promise<TutorProfileDraft>; // POST /tutor/profile/submit
  getWeek(): Promise<WeekSchedule>; // GET /tutor/schedule
  saveWeek(week: WeekSchedule): Promise<WeekSchedule>; // PUT /tutor/schedule
  listExceptions(): Promise<ScheduleException[]>; // GET /tutor/schedule/exceptions
  saveException(item: ScheduleException): Promise<ScheduleException[]>; // PUT /tutor/schedule/exceptions/:date
  deleteException(date: string): Promise<ScheduleException[]>; // DELETE /tutor/schedule/exceptions/:date
  uploadPhoto(file: File): Promise<{ url: string }>; // POST /tutor/photo
  listDocuments(): Promise<TutorDocument[]>; // GET /tutor/documents
  uploadDocument(title: string, file: File): Promise<TutorDocument>; // POST /tutor/documents
  listMyStudents(): Promise<StudentSummary[]>; // GET /tutor/students
  listMyTutors(): Promise<TutorSummary[]>; // GET /me/tutors

  // Администратор
  adminCancellations(): Promise<AdminCancellation[]>; // GET /admin/cancellations
  adminDisputes(): Promise<(Dispute & { lesson: Lesson })[]>; // GET /admin/disputes
  adminResolveDispute(id: Id, outcome: 'refund' | 'pay'): Promise<Dispute>; // POST /admin/disputes/:id/resolve
  adminReviewQueue(): Promise<Review[]>; // GET /admin/reviews
  adminModerateReview(id: Id, approve: boolean): Promise<Review>; // POST /admin/reviews/:id
  adminProfileQueue(): Promise<AdminProfile[]>; // GET /admin/profiles
  adminModerateProfile(tutorId: Id, approve: boolean, note?: string): Promise<TutorProfileDraft>; // POST /admin/profiles/:tutorId
}

/** Ошибка API с понятным пользователю текстом. */
export class ApiError extends Error {
  constructor(message: string, readonly status = 400, readonly code?: string) {
    super(message);
  }
}
