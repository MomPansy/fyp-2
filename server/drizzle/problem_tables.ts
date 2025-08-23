import {
  foreignKey,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { problems } from "./problems.ts";
import { ColumnType, ForeignKeyMapping } from "./_custom.ts";

export const problemTables = pgTable("problem_tables", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  problemId: uuid("problem_id").notNull(),
  tableName: text("table_name").notNull(),
  ddlScript: text("ddl_script").notNull(),
  dataPath: text("data_path").notNull(),
  columnTypes: jsonb("column_types").$type<ColumnType[]>(),
  relations: jsonb("relations").$type<ForeignKeyMapping[]>(),
  numberOfRows: integer("number_of_rows"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.problemId],
    foreignColumns: [problems.id],
    name: "problem_tables_problem_id_fk",
  }),
]);

export const problemTablesRelations = relations(problemTables, ({ one }) => ({
  problem: one(problems, {
    fields: [problemTables.problemId],
    references: [problems.id],
  }),
}));
