import { Dialect } from "server/problem-database/mappings.ts";
import { type Database } from "@/database.gen.ts";

export const problemKeys = {
  all: ["problems"] as const,
  detail: (id: string) => ["problems", id] as const,
};

type ProblemTableColumns =
  Database["public"]["Tables"]["problem_tables"]["Row"];

export const problemTableKeys = {
  all: ["problemTables"] as const,
  lists: () => [...problemTableKeys.all, "list"] as const,
  list: (
    filters: Partial<Pick<ProblemTableColumns, "problem_id" | "table_name">>,
  ) => [...problemTableKeys.lists(), filters] as const,
  details: () => [...problemTableKeys.all, "details"] as const,
  detail: (id: string) => [...problemTableKeys.details(), id] as const,
  byProblemId: (problemId: string) =>
    [...problemTableKeys.all, "byProblemId", problemId] as const,
  metadataByProblemId: (problemId: string) =>
    [...problemTableKeys.all, "metadata", "byProblemId", problemId] as const,
  basicByProblemId: (problemId: string) =>
    [...problemTableKeys.all, "basic", "byProblemId", problemId] as const,
  byTableName: (tableName: string) =>
    [...problemTableKeys.all, "byTableName", tableName] as const,
  byTableId: (id: string) =>
    [...problemTableKeys.all, "byTableId", id] as const,
  columns: () => [...problemTableKeys.all, "columns"] as const,
  columnTypes: (id: string) => [...problemTableKeys.columns(), id] as const,
  relations: () => [...problemTableKeys.all, "relations"] as const,
  relationsByProblemId: (problemId: string) =>
    [...problemTableKeys.relations(), problemId] as const,
  ddlScript: (id: string) =>
    [...problemTableKeys.all, "ddlScript", id] as const,
  withRelations: () => [...problemTableKeys.all, "withRelations"] as const,
};

export const databaseKeys = {
  all: ["database"] as const,
  connect: (problemId: string, dialect: Dialect) =>
    ["database", "connect", problemId, dialect] as const,
};
