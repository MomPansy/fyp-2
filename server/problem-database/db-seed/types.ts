import type {
  DatabasePool,
  MysqlPool,
  OraclePool,
  PostgresPool,
  SqlitePool,
  SqlServerPool,
} from "../pools.ts";
import type {
  MappedRelation,
  MapppedColumn,
} from "server/problem-database/mappings.ts";

export interface SeedTable {
  table_name: string;
  column_types: MapppedColumn[] | null;
  data_path?: string | null;
  relations: MappedRelation[] | null;
}

interface SuccessResult {
  rows?: Record<string, unknown>[];
  rowCount?: number;
  affectedRows?: number;
}

interface ErrorResult {
  error: string;
}

export type QueryResult = SuccessResult | ErrorResult;

export interface CountResult extends Record<string, unknown> {
  count: number;
}

export interface ExistsResult extends Record<string, unknown> {
  exists: boolean;
}

// Type mapping for dialect-specific pool return types
export interface DialectPoolReturn {
  postgres: PostgresPool;
  mysql: MysqlPool;
  sqlite: SqlitePool;
  sqlserver: SqlServerPool;
  oracle: OraclePool;
}

// Generic interface for database operations
export interface DatabaseOperations {
  createTable(pool: DatabasePool, table: SeedTable): Promise<void>;
  setRelations(
    pool: DatabasePool,
    tableName: string,
    relations: MappedRelation[] | null,
  ): Promise<void>;
  seedTable(pool: DatabasePool, table: SeedTable): Promise<void>;
  ensureForeignTableExists(
    pool: DatabasePool,
    foreignTableName: string,
  ): Promise<void>;
}
