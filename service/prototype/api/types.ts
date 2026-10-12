/* Domain model of the TopRepet marketplace. Every timestamp is UTC milliseconds. */

export type ID = string;
export type Role = 'student' | 'tutor' | 'admin';
export type Tone = 'orange' | 'indigo' | 'green' | 'plum' | 'sand' | 'teal';

export interface SavedCard {
  id: ID;
  last4: string;
  brand: 'Мир' | 'Visa' | 'Mastercard';
}

export interface Child {
  id: ID;
  name: string;
  age: string;
}

export interface Onboarding {
  step: 0 | 1 | 2 | 3; // last finished step
  done: boolean;
  forWhom: 'self' | 'other';
  goal?: string;
  subject?: string;
}

export interface User {
  id: ID;
  role: Role;
  name: string;
  email: string;
  passwordHash?: string;
  viaYandex?: boolean;
  tz: string;
  tone: Tone;
  photo?: string;
  createdAt: number;
  onboarding?: Onboarding;
  children: Child[];
  favorites: ID[]; // tutor user ids
  cards: SavedCard[];
  settings: { emailUnread: boolean; lessonReminders: boolean };
  blocked: ID[]; // users this person blocked
  promoUsed: string[];
  demo?: boolean;
}

export type StudentCategory = 'Дошкольники' | 'Школьники' | 'Студенты' | 'Взрослые';

export interface TutorSubject {
  subject: string;
  goals: string[];
  students: StudentCategory[];
}

export interface PriceItem {
  id: ID;
  subject: string;
  minutes: number;
  price: number; // the tutor's own price; the student sees +10 %
}

export interface TutorDoc {
  id: ID;
  name: string;
  size: number;
  uploadedAt: number;
  status: 'review' | 'ok' | 'rejected';
  reason?: string;
  title?: string; // what it proves, shown on the public profile once verified
}

export interface ClosedRange {
  id: ID;
  from: string; // YYYY-MM-DD in the tutor's zone
  to: string;
  note?: string;
}

export interface ExtraWindow {
  id: ID;
  date: string; // YYYY-MM-DD in the tutor's zone
  from: number; // hour
  to: number; // hour, exclusive
}

export interface Payout {
  status: 'self' | 'ip' | 'none';
  inn: string;
  card: string; // masked card number for transfers
  partner: boolean; // TopRepet connected as partner in «Мой налог»
}

export interface ResponseTemplate {
  id: ID;
  title: string;
  text: string;
}

export interface TutorProfile {
  userId: ID;
  slug: string;
  name: string;
  photo?: string;
  tone: Tone;
  about: string;
  education: string;
  experienceText: string;
  experienceYears: number;
  achievements: { title: string; text: string; verified?: boolean }[];
  approach: string;
  helpTopics: string[];
  gender: 'f' | 'm' | '';
  city: string;
  tz: string;
  subjects: TutorSubject[];
  formats: { online: boolean; atHome: boolean; atStudent: boolean; district: string };
  services: string[];
  intro: { enabled: boolean; minutes: number };
  prices: PriceItem[];
  weekly: boolean[][]; // [weekday 0=Mon][hour 0..23], in the tutor's zone
  closed: ClosedRange[];
  extra: ExtraWindow[];
  horizonWeeks: 1 | 2 | 4;
  minNoticeHours: 2 | 12 | 24;
  docs: TutorDoc[];
  published: boolean;
  visible: boolean; // false = pause
  publishedAt?: number;
  draftSavedAt?: number;
  createdAt: number;
  templates: ResponseTemplate[];
  payout?: Payout;
  legacyId?: string;
  demo?: boolean;
}

export type LessonKind = 'lesson' | 'intro';
export type LessonStatus =
  | 'pending' // waiting for the tutor, money held
  | 'confirmed' // charged (or free intro accepted)
  | 'unpaid' // series lesson whose automatic charge failed
  | 'declined'
  | 'expired'
  | 'cancelled'
  | 'completed'
  | 'no_show' // tutor marked that the student did not come
  | 'disputed';

export interface Participant {
  kind: 'self' | 'child';
  childId?: ID;
  name: string;
  age?: string;
}

export interface Reschedule {
  by: 'student' | 'tutor';
  newStart: number;
  at: number;
  status: 'pending' | 'accepted' | 'declined';
}

export interface Lesson {
  id: ID;
  number: number; // human friendly booking number
  kind: LessonKind;
  studentId: ID;
  tutorId: ID;
  participant: Participant;
  subject: string;
  minutes: number;
  start: number;
  end: number;
  status: LessonStatus;
  tutorPrice: number;
  studentPrice: number;
  discount: number; // promo paid by the service; the tutor still gets the full price
  comment?: string;
  createdAt: number;
  confirmDeadline: number;
  confirmedAt?: number;
  seriesId?: ID;
  requestId?: ID;
  responseId?: ID;
  paymentId?: ID;
  link?: string;
  linkAt?: number;
  cancel?: { by: 'student' | 'tutor' | 'system'; at: number; reason: string; refund: boolean };
  decline?: { reason: string; message: string; proposals: number[]; at: number };
  reschedule?: Reschedule;
  studentAnswer?: { ok: boolean; at: number };
  completedAt?: number;
  noShowAt?: number;
  disputeId?: ID;
  reviewId?: ID;
  reviewAsked?: boolean;
  reminders: { h24?: boolean; h1?: boolean; link15?: boolean; charge?: boolean };
  payoutId?: ID;
}

export interface Series {
  id: ID;
  studentId: ID;
  tutorId: ID;
  participant: Participant;
  subject: string;
  minutes: number;
  pattern: { weekday: number; hour: number; minute: number }[]; // in the student's zone
  count: number;
  lessonIds: ID[];
  skippedDates: number[]; // starts moved to the end because of the tutor's closed days
  status: 'pending' | 'confirmed' | 'declined' | 'expired' | 'cancelled';
  tutorPrice: number;
  studentPrice: number;
  createdAt: number;
  confirmDeadline: number;
  cardId?: ID;
}

export type PaymentStatus = 'held' | 'released' | 'charged' | 'refunded' | 'partial_refund' | 'failed' | 'pending_charge';

export interface PaymentEvent {
  at: number;
  type: 'hold' | 'release' | 'charge' | 'refund' | 'fail' | 'freeze';
  amount: number;
  note?: string;
}

export interface Payment {
  id: ID;
  studentId: ID;
  lessonId: ID;
  amount: number;
  method: { kind: 'card'; last4: string; brand?: string; cardId?: ID } | { kind: 'sbp' };
  status: PaymentStatus;
  refunded: number;
  events: PaymentEvent[];
  createdAt: number;
  receipt?: string;
}

export interface Transfer {
  id: ID;
  tutorId: ID;
  lessonId: ID;
  amount: number;
  status: 'waiting' | 'sent' | 'failed' | 'disputed' | 'cancelled';
  dueAt: number;
  sentAt?: number;
  failReason?: string;
  reason?: string;
}

export type RequestStatus = 'active' | 'paused' | 'hidden' | 'closed' | 'expired' | 'draft';

export interface LessonRequest {
  id: ID;
  slug: string;
  studentId: ID;
  title: string;
  direction: string;
  subject: string;
  level: string;
  goal: string;
  forChild: boolean;
  childAge?: string;
  format: 'online' | 'offline';
  budget: number | null; // max price for the student per 60 min, null = any
  times: ('weekday-morning' | 'weekday-day' | 'weekday-evening' | 'weekend')[];
  frequency: string;
  status: RequestStatus;
  createdAt: number;
  publishedAt?: number;
  expiresAt?: number;
  responseLimit: number;
  closedAt?: number;
  closedReason?: 'booked' | 'student' | 'expired';
  bookedTutorId?: ID;
  expiryAsked?: boolean;
}

export interface RequestResponse {
  id: ID;
  requestId: ID;
  tutorId: ID;
  message: string;
  price: number; // tutor price for 60 min
  slots: number[];
  createdAt: number;
  status: 'sent' | 'viewed' | 'booked' | 'declined' | 'other';
}

export type ChatKind = 'pair' | 'support';

export interface Chat {
  id: ID;
  kind: ChatKind;
  studentId?: ID;
  tutorId?: ID;
  userId?: ID; // support: the person asking
  lessonId?: ID; // support context
  createdAt: number;
  lastAt: number;
}

export type MessageKind = 'text' | 'file' | 'event' | 'proposal';

/* Event texts may contain {t:<timestamp>} tokens, rendered in each viewer's own time zone.
   The tutor can get a differently worded text (the student reads «Вы записались», the tutor «Ольга записалась»). */
export interface ChatEvent {
  icon: string;
  text: string;
  sub?: string;
  action?: { label: string; to: string; tone?: 'gray' | 'tinted' };
  tutor?: { text?: string; sub?: string; action?: { label: string; to: string; tone?: 'gray' | 'tinted' } | null };
}

export interface Message {
  id: ID;
  chatId: ID;
  authorId: ID | 'system' | 'support';
  kind: MessageKind;
  text?: string;
  file?: { name: string; size: number; type: string; dataUrl?: string };
  event?: ChatEvent;
  proposal?: { slots: number[]; subject: string; minutes: number; tutorPrice: number; usedSlot?: number };
  createdAt: number;
  readAt?: number;
  masked?: boolean;
  emailed?: boolean;
}

export interface Review {
  id: ID;
  lessonId: ID;
  studentId: ID;
  tutorId: ID;
  rating: number;
  text: string;
  status: 'review' | 'published' | 'rejected';
  reason?: string;
  createdAt: number;
  publishedAt?: number;
  reply?: { text: string; at: number };
  complaint?: { reason: string; text: string; at: number; status: 'open' | 'kept' | 'removed' };
}

export interface Dispute {
  id: ID;
  number: number;
  lessonId: ID;
  studentId: ID;
  tutorId: ID;
  source: 'problem' | 'tutor_absent' | 'no_show_contest';
  reason: string;
  details: string;
  shots: { name: string; dataUrl?: string }[];
  createdAt: number;
  tutorDeadline: number;
  decideBy: number;
  tutorAnswer?: { text: string; at: number; shots: { name: string; dataUrl?: string }[] };
  status: 'open' | 'resolved';
  resolution?: { kind: 'refund_full' | 'refund_partial' | 'pay_tutor'; refund: number; comment: string; at: number };
}

export interface Complaint {
  id: ID;
  byId: ID;
  againstId: ID;
  chatId: ID;
  messageId?: ID;
  reason: string;
  createdAt: number;
  status: 'open' | 'resolved';
  blocked: boolean;
}

export interface Notice {
  id: ID;
  userId: ID;
  at: number;
  icon: string;
  title: string;
  text: string;
  to?: string;
  read: boolean;
  tone?: 'action' | 'ok' | 'bad';
}

export interface Email {
  id: ID;
  to: ID;
  email: string;
  at: number;
  subject: string;
  title: string;
  body: string;
  quote?: { author: string; text: string; time: string };
  action?: { label: string; to: string };
  reason?: string;
}

/* A window kept for a student for 15 minutes after a failed payment. */
export interface Reservation {
  id: ID;
  tutorId: ID;
  studentId: ID;
  start: number;
  minutes: number;
  expiresAt: number;
}

export interface ResetToken {
  token: string;
  userId: ID;
  expiresAt: number;
  used: boolean;
}

export interface Db {
  version: number;
  seq: number;
  users: User[];
  tutors: TutorProfile[];
  lessons: Lesson[];
  series: Series[];
  payments: Payment[];
  transfers: Transfer[];
  requests: LessonRequest[];
  responses: RequestResponse[];
  chats: Chat[];
  messages: Message[];
  reviews: Review[];
  disputes: Dispute[];
  complaints: Complaint[];
  notices: Notice[];
  emails: Email[];
  resets: ResetToken[];
  reservations: Reservation[];
}
