import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const requests = sqliteTable('requests', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  contact: text('contact').notNull(),
  direction: text('direction').notNull(),
  message: text('message').notNull(),
  consent: integer('consent').notNull(),
  createdAt: text('created_at').notNull(),
});
