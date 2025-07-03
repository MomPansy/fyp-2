import {
  foreignKey,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { problems } from "./problems.js";
const problemTables = pgTable("problem_tables", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  problemId: uuid("problem_id").notNull(),
  tableName: text("table_name").notNull(),
  ddlScript: text("ddl_script").notNull(),
  dataPath: text("data_path").notNull(),
  columnTypes: jsonb("column_types").$type(),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => [
  foreignKey({
    columns: [table.problemId],
    foreignColumns: [problems.id],
    name: "problem_tables_problem_id_fk"
  })
]);
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
