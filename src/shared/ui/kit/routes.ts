/* Where the mockup's actions lead. Screens that are not built yet point to the closest existing page;
   see docs/figma-implementation.md, "Открытые вопросы". */
export const routes = {
  lessons: '/lessons/',
  teachers: '/teachers/',
  teacher: (id: string) => `/teachers/${id}/`,
  forTutors: '/for-repetitor/',
  freeIntro: '/free-intro/',
  blog: '/blog/',
  // Login and the request wizard are not built yet.
  login: '/lessons/',
  newRequest: '/lessons/',
} as const;
