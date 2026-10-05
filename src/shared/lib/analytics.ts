import {
  subjects,
  foundationSubjects,
  goals,
  exams,
} from '../../entities/lesson';

export type AnalyticsGoal =
  | 'contact_student_click'
  | 'contact_tutor_click'
  | 'contact_telegram'
  | 'contact_whatsapp'
  | 'contact_vk'
  | 'contact_max'
  | 'lesson_picker_view'
  | 'lesson_selection'
  | 'lesson_contact_step'
  | 'teachers_catalog_view'
  | 'teacher_profile_view'
  | 'teacher_search'
  | 'teacher_filter'
  | 'faq_open'
  | 'section_view'
  | 'scroll_75'
  | 'engaged_60'
  | 'blog_article_view'
  | 'blog_cta_click'
  | 'promo_check';
type Params = Record<string, string | number | boolean>;
// Analytics is paused while the cookie interface and operator documents are removed.
// Keep the event API used by the UI without loading trackers or sending data.
export function trackGoal(_goal: AnalyticsGoal, _params: Params = {}) {}
export function trackMessenger(_messenger: 'telegram' | 'whatsapp' | 'vk' | 'max') {}
export function safeChoice(value: string) {
  return [...subjects, ...foundationSubjects, ...exams, ...goals.map(item => item.id), ...goals.map(item => item.label), 'До школы', ...Array.from({ length: 11 }, (_, i) => String(i + 1))].includes(value) ? value : 'other';
}
