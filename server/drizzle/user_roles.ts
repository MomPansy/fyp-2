import { relations } from 'drizzle-orm';
import {
  primaryKey,
  pgTable,
  timestamp,
  uuid,
  foreignKey,
  unique,
} from 'drizzle-orm/pg-core';

import { users } from './users.ts';
import { roles } from './roles.ts';

export const userRoles = pgTable(
  'user_roles',
  {
    userId: uuid('user_id').notNull(),
    roleId: uuid('role_id').notNull(),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .notNull(),
    createdBy: uuid('created_by'),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date()),
    updatedBy: uuid('updated_by'),
    archivedAt: timestamp('archived_at', { precision: 3, withTimezone: true }),
  },
  (table) => [
    unique('user_roles_unique').on(table.userId, table.roleId),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'user_roles_user_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: 'user_roles_created_by_fk',
    }),
    foreignKey({
      columns: [table.roleId],
      foreignColumns: [roles.id],
      name: 'user_roles_role_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.updatedBy],
      foreignColumns: [users.id],
      name: 'user_roles_updated_by_fk',
    }),
    primaryKey({
      name: 'user_roles_pk',
      columns: [table.userId, table.roleId],
    }),
  ],
);

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}));
