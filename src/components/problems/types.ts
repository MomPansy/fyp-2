import { Database } from "@/database.gen.ts";
import { type TableMetadata } from "../../../server/drizzle/_custom.ts";

export type { TableMetadata };

export type ProblemInsert = Database["public"]["Tables"]["problems"]["Insert"];
export type ProblemRow = Database["public"]["Tables"]["problems"]["Row"];
