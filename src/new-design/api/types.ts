/**
 * Контракт данных между фронтендом и бэкендом TopRepet.
 * Даты передаются строками ISO 8601 в UTC, деньги целыми рублями.
 * Цена для ученика = цена репетитора + сервисный сбор 10% (считает бэкенд, фронтенд только показывает).
 */

export type Id = string;
export type IsoDate = string;
export type Role = 'student' | 'tutor' | 'admin';

export interface User {
  id: Id;
  role: Role;
  name: string;
  email: string;
  emailVerified: boolean;
  timezone: string;
  /** Для репетитора: id его анкеты. */
  tutorId?: Id;
  onboarded: boolean;
  photo?: string | null;
  /** Какие уведомления присылать на почту. */
  notifications?: { lessons: boolean; messages: boolean; reminders: boolean };
}

export interface Achievement { title: string; text: string }

export type TutorStatus = 'draft' | 'review' | 'published' | 'hidden';

/** Длительность стандартного урока: все цены в контракте указаны за него. */
export const LESSON_MINUTES = 60;

export interface Tutor {
  id: Id;
  name: string;
  photo: string;
  photoSrcSet?: string;
  headline: string;
  subjects: string[];
  cardSubjects: string;
  helpTopics: string[];
  experience: string;
  intro: string;
  approach: string;
  achievements: Achievement[];
  /** Цена, которую получает репетитор за стандартный урок (LESSON_MINUTES). */
  price: number;
  /** Цена для ученика за стандартный урок (сбор уже добавлен сервером). */
  studentPrice: number;
  /** Длительность бесплатного знакомства в минутах, выбирает репетитор. 0 — знакомства нет. */
  introMinutes: number;
  rating: number | null;
  reviewsCount: number;
  status: TutorStatus;
  timezone: string;
  /** Хотя бы один диплом или сертификат проверен администратором. */
  documentsVerified?: boolean;
}

export interface TutorFilter {
  query?: string;
  subject?: string | null;
  priceMax?: number | null;
  hasIntro?: boolean;
  sort?: 'recommended' | 'price_asc' | 'price_desc';
  cursor?: string | null;
  limit?: number;
}

export interface Page<T> { items: T[]; total: number; nextCursor: string | null }

export interface Slot { start: IsoDate; available: boolean }

export type LessonKind = 'intro' | 'regular';
export type LessonStatus =
  | 'pending' // ждёт подтверждения репетитора, деньги заморожены
  | 'confirmed'
  | 'declined'
  | 'expired' // репетитор не ответил вовремя
  | 'cancelled'
  | 'completed'
  | 'no_show_student'
  | 'no_show_tutor'
  | 'disputed';

export type PaymentState = 'none' | 'hold' | 'captured' | 'refunded' | 'paid_out';

export interface Lesson {
  id: Id;
  kind: LessonKind;
  tutorId: Id;
  tutorName: string;
  tutorPhoto: string;
  studentId: Id;
  studentName: string;
  /** Фото ученика: видно репетитору. */
  studentPhoto?: string | null;
  subject: string;
  start: IsoDate;
  durationMin: number;
  status: LessonStatus;
  /** Сколько платит ученик. */
  price: number;
  /** Сколько получает репетитор. */
  tutorPrice: number;
  payment: PaymentState;
  /** Крайний срок подтверждения для pending. */
  confirmBy?: IsoDate;
  meetingUrl?: string | null;
  cancelReason?: string;
  cancelledBy?: Role;
  declineReason?: string;
  /** Предложенный перенос, ждёт ответа второй стороны. */
  moveProposal?: { start: IsoDate; by: Role } | null;
  reviewId?: Id | null;
  disputeId?: Id | null;
  seriesId?: Id | null;
}

export interface CreateBookingInput {
  tutorId: Id;
  kind: LessonKind;
  start: IsoDate;
  durationMin: number;
  subject: string;
  cardId?: Id;
  /** Если запись создана из отклика на заявку. */
  requestId?: Id;
}

export type RequestStatus = 'open' | 'booked' | 'expired' | 'closed';

export interface StudyRequest {
  id: Id;
  studentId: Id;
  studentName: string;
  studentPhoto?: string | null;
  /** Предметы одной строкой: «Математика, Физика» или свой предмет. */
  subject: string;
  subjects?: string[];
  /** Предмет, который ученик написал сам: такую заявку видят все репетиторы. */
  customSubject?: string;
  goal: string;
  level: string;
  budgetMax: number | null;
  schedule: string[];
  description: string;
  status: RequestStatus;
  createdAt: IsoDate;
  expiresAt: IsoDate;
  responsesCount: number;
}

export interface CreateRequestInput {
  subjects: string[];
  customSubject: string;
  goal: string;
  level: string;
  budgetMax: number | null;
  schedule: string[];
  description: string;
}

export type ResponseStatus = 'sent' | 'accepted' | 'declined' | 'closed';

export interface RequestResponse {
  id: Id;
  requestId: Id;
  tutorId: Id;
  tutorName: string;
  tutorPhoto: string;
  tutorRating: number | null;
  price: number;
  message: string;
  slots: IsoDate[];
  status: ResponseStatus;
  createdAt: IsoDate;
}

export interface Conversation {
  id: Id;
  peerName: string;
  peerPhoto: string | null;
  peerRole: Role;
  lastMessage: string;
  updatedAt: IsoDate;
  unread: number;
  tutorId: Id;
  studentId: Id;
  /** Один из собеседников заблокировал диалог после жалобы. */
  blocked?: boolean;
}

export type MessageKind = 'text' | 'event' | 'proposal' | 'photo';

export interface Message {
  id: Id;
  conversationId: Id;
  authorId: Id | null; // null — системное событие
  kind: MessageKind;
  text: string;
  at: IsoDate;
  proposalStart?: IsoDate;
  /** Для своих сообщений: собеседник уже открыл диалог. */
  read?: boolean;
  imageUrl?: string;
}

export interface Card { id: Id; brand: string; last4: string; primary: boolean }

export type PaymentKind = 'hold' | 'charge' | 'refund' | 'release';

export interface PaymentRecord {
  id: Id;
  lessonId: Id;
  title: string;
  amount: number;
  kind: PaymentKind;
  at: IsoDate;
  cardLast4: string;
}

export interface Finance {
  available: number;
  pending: number;
  paidThisMonth: number;
  entries: { id: Id; title: string; amount: number; status: 'pending' | 'paid' | 'held'; at: IsoDate }[];
}

export interface PayoutSettings { inn: string; cardLast4: string | null; selfEmployedConfirmed: boolean }

export interface Notification {
  id: Id;
  kind: 'lesson' | 'request' | 'message' | 'payment' | 'review' | 'system';
  title: string;
  text: string;
  at: IsoDate;
  read: boolean;
  link: string | null;
}

export interface Review {
  id: Id;
  lessonId: Id;
  tutorId: Id;
  authorName: string;
  authorNote: string;
  rating: number;
  text: string;
  status: 'pending' | 'published' | 'rejected';
  createdAt: IsoDate;
  reply: string | null;
}

export type DisputeStatus = 'open' | 'tutor_replied' | 'resolved_refund' | 'resolved_paid';

export interface Dispute {
  id: Id;
  lessonId: Id;
  reason: string;
  text: string;
  status: DisputeStatus;
  createdAt: IsoDate;
  tutorReply: string | null;
  resolution: string | null;
}

export interface ProblemInput { lessonId: Id; reason: string; text: string }

export interface WeekInterval { from: string; to: string } // «18:00»
export interface WeekSchedule { days: { weekday: number; intervals: WeekInterval[] }[] } // 1 — понедельник
export interface ScheduleException { date: string; kind: 'off' | 'extra'; intervals: WeekInterval[] }

export interface TutorProfileDraft {
  name: string;
  headline: string;
  about: string;
  approach: string;
  subjects: string[];
  levels: string[];
  experience: string;
  education: Achievement[];
  price: number;
  introMinutes: number;
  durations: number[];
  photo: string | null;
  status: TutorStatus;
  slug: string;
  /** Комментарий модератора, если анкету вернули на доработку. */
  moderationNote?: string | null;
}

export interface TutorDocument { id: Id; title: string; status: 'uploaded' | 'checking' | 'approved' | 'rejected' }

export interface StudentSummary { id: Id; name: string; note: string; lessonsCount: number; nextLesson: IsoDate | null }
export interface TutorSummary { tutorId: Id; name: string; photo: string; subject: string; lessonsCount: number; lastLesson: IsoDate | null }

export interface AdminCancellation { lessonId: Id; tutorName: string; studentName: string; by: Role; reason: string; at: IsoDate; late: boolean }

/** Анкета в очереди на проверку (админка). */
export interface AdminProfile { tutorId: Id; email: string; submittedAt: IsoDate; profile: TutorProfileDraft }
