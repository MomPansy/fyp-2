import {
  foreignKey,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users.ts";
import { problems } from "./problems.ts";

export const userProblems = pgTable(
  "user_problems",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    user_id: uuid("user_id").notNull(),
    problem_id: uuid("problem_id"),
    name: text("name").notNull(),
    description: text("description").notNull(),
    answer: text("answer"),
    createdAt: timestamp("created_at", { precision: 3, withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date()),
    archived_at: timestamp("archived_at", { precision: 3, withTimezone: true }),
  },
  (table) => [
    // Foreign key constraints
    foreignKey({
      columns: [table.user_id],
      foreignColumns: [users.id],
      name: "user_problems_user_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.problem_id],
      foreignColumns: [problems.id],
      name: "user_problems_problem_id_fk",
    }).onDelete("cascade"),
  ],
);

export const userProblemsRelations = relations(userProblems, ({ one }) => ({
  foreignKey: one(users, {
    fields: [userProblems.user_id],
    references: [users.id],
  }),
  problem: one(problems, {
    fields: [userProblems.problem_id],
    references: [problems.id],
  }),
}));
