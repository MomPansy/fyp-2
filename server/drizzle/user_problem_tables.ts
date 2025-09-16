import {
  foreignKey,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { userProblems } from "./user_problems.ts";
import { ColumnType, ForeignKeyMapping } from "./_custom.ts";

export const userProblemTables = pgTable(
  "user_problem_tables",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    problemId: uuid("problem_id").notNull(),
    tableName: text("table_name").notNull(),
    dataPath: text("data_path").notNull(),
    columnTypes: jsonb("column_types").$type<ColumnType[]>(),
    relations: jsonb("relations").$type<ForeignKeyMapping[]>(),
    numberOfRows: integer("number_of_rows"),
    description: text("description"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.problemId],
      foreignColumns: [userProblems.id],
      name: "problem_user_tables_user_problem_id_fk",
    }),
  ],
);

export const problemTablesRelations = relations(
  userProblemTables,
  ({ one }) => ({
    problem: one(userProblems, {
      fields: [userProblemTables.problemId],
      references: [userProblems.problem_id],
    }),
  }),
);
