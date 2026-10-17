// Выгружает демо-каталог репетиторов для backend/manage.py seed_demo: тот же список, что показывает мок.
// Запуск: pnpm exec tsx scripts/export-demo.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { staticTutors } from '../src/new-design/api/mock.ts';

mkdirSync('backend/tutors/fixtures', { recursive: true });
const tutors = staticTutors().map((t, index) => ({ ...t, sortOrder: index }));
writeFileSync('backend/tutors/fixtures/demo_tutors.json', `${JSON.stringify(tutors, null, 2)}\n`);
console.log(`demo_tutors.json: ${tutors.length}`);
