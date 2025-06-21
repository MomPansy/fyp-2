import { relations } from 'drizzle-orm';
import {
  pgTable,
  timestamp,
  uuid,
  primaryKey,
  foreignKey,
} from 'drizzle-orm/pg-core';

import { users } from './users.ts';

export const userRoles = pgTable(
  'user_roles',
  {
    userId: uuid('user_id').notNull(),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    archivedAt: timestamp('archived_at', { precision: 3, withTimezone: true }),
  },
  (table) => [
    primaryKey({
      name: 'user_roles_pk',
      columns: [table.userId],
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'user_roles_user_id_fk',
    }).onDelete('cascade'),
  ],
);

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
}));
