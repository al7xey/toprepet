export const tutorExperienceOptions = [
  'Менее 1 года',
  '1–3 года',
  '3–5 лет',
  'Более 5 лет',
] as const;

export type TutorExperience = (typeof tutorExperienceOptions)[number];
