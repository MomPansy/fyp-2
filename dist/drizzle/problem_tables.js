import {
  foreignKey,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  integer
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { problems } from "./problems.js";
const problemTables = pgTable(
  "problem_tables",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    problemId: uuid("problem_id").notNull(),
    tableName: text("table_name").notNull(),
    dataPath: text("data_path").notNull(),
    columnTypes: jsonb("column_types").$type(),
    relations: jsonb("relations").$type(),
    numberOfRows: integer("number_of_rows"),
    description: text("description"),
    createdAt: timestamp("created_at", { precision: 3, withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date())
  },
  (table) => [
    foreignKey({
      columns: [table.problemId],
      foreignColumns: [problems.id],
      name: "problem_tables_problem_id_fk"
    })
  ]
);
const problemTablesRelations = relations(problemTables, ({ one }) => ({
  problem: one(problems, {
    fields: [problemTables.problemId],
    references: [problems.id]
  })
}));
export {
  problemTables,
  problemTablesRelations
};
