import { relations } from "drizzle-orm";
import { pgTable, timestamp } from "drizzle-orm/pg-core";
import { userRoles } from "./user_roles.js";
import { citext } from "./_custom.js";
const roles = pgTable("roles", {
  id: citext("id").notNull().primaryKey(),
  createdAt: timestamp("created_at", { precision: 3, withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, withTimezone: true }).defaultNow().notNull().$onUpdate(() => /* @__PURE__ */ new Date()),
  archivedAt: timestamp("archived_at", { precision: 3, withTimezone: true })
});
const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles)
}));
export {
  roles,
  rolesRelations
};
