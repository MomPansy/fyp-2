import { Dialect } from "server/problem-database/mappings.ts";
import { type Database } from "@/database.gen.ts";

export const userProblemKeys = {
  all: ["user_problems"] as const,
  detail: (id: string) => ["user_problems", id] as const,
};

type ProblemTableColumns =
  Database["public"]["Tables"]["user_problem_tables"]["Row"];

export const userProblemTableKeys = {
  all: ["user_problemTables"] as const,
  lists: () => [...userProblemTableKeys.all, "list"] as const,
  list: (
    filters: Partial<Pick<ProblemTableColumns, "problem_id" | "table_name">>,
  ) => [...userProblemTableKeys.lists(), filters] as const,
  details: () => [...userProblemTableKeys.all, "details"] as const,
  detail: (id: string) => [...userProblemTableKeys.details(), id] as const,
  byProblemId: (problemId: string) =>
    [...userProblemTableKeys.all, "byProblemId", problemId] as const,
  metadataByProblemId: (problemId: string) =>
    [
      ...userProblemTableKeys.all,
      "metadata",
      "byProblemId",
      problemId,
    ] as const,
  basicByProblemId: (problemId: string) =>
    [...userProblemTableKeys.all, "basic", "byProblemId", problemId] as const,
  byTableName: (tableName: string) =>
    [...userProblemTableKeys.all, "byTableName", tableName] as const,
  byTableId: (id: string) =>
    [...userProblemTableKeys.all, "byTableId", id] as const,
  columns: () => [...userProblemTableKeys.all, "columns"] as const,
  columnTypes: (id: string) => [...userProblemTableKeys.columns(), id] as const,
  relations: () => [...userProblemTableKeys.all, "relations"] as const,
  relationsByProblemId: (problemId: string) =>
    [...userProblemTableKeys.relations(), problemId] as const,
  ddlScript: (id: string) =>
    [...userProblemTableKeys.all, "ddlScript", id] as const,
  withRelations: () => [...userProblemTableKeys.all, "withRelations"] as const,
};

export const databaseKeys = {
  all: ["database"] as const,
  connect: (problemId: string, dialect: Dialect) =>
    ["database", "connect", problemId, dialect] as const,
};
