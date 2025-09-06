/* eslint-disable @typescript-eslint/no-unused-vars */
import { HTTPException } from "hono/http-exception";
import { ColumnType, ForeignKeyMapping } from "server/drizzle/_custom.ts";

/**
 * SQL Type Mapping Utilities
 *
 * This module provides comprehensive type mapping functionality between
 * universal data types and database-specific SQL types. It supports
 * multiple database dialects and includes validation, error handling,
 * and utility functions for database schema management.
 */

// Supported database dialects
const DIALECTS = [
  "postgres",
  "mysql",
  "sqlite",
  "sqlserver",
  "oracle",
] as const;

export type Dialect = (typeof DIALECTS)[number];

// Universal data types that can be mapped to SQL types
const DATA_TYPES = [
  "integer", // Whole numbers
  "number", // Floating point numbers
  "string", // Text data
  "boolean", // True/false values
  "date", // Date only (no time)
  "datetime", // Date and time
  "time", // Time only (no date)
  "yearmonth", // Year and month (e.g., 2024-03)
  "year", // Year only
  "duration", // Time intervals/durations
] as const;

const POSTGRES_TYPES = [
  "INTEGER",
  "DOUBLE PRECISION",
  "TEXT",
  "BOOLEAN",
  "DATE",
  "TIMESTAMP WITHOUT TIME ZONE",
  "TIME WITHOUT TIME ZONE",
  "DATE",
  "SMALLINT",
  "INTERVAL",
] as const;

export type PostgresType = (typeof POSTGRES_TYPES)[number];

const MYSQL_TYPES = [
  "INT",
  "DOUBLE",
  "TEXT",
  "TINYINT(1)",
  "DATE",
  "DATETIME",
  "TIME",
  "CHAR(7)",
  "YEAR",
  "BIGINT",
] as const;

export type MySqlType = (typeof MYSQL_TYPES)[number];

const SQLITE_TYPES = [
  "INTEGER",
  "REAL",
  "TEXT",
  "INTEGER", // Boolean as 0/1
  "TEXT", // Date as ISO8601 string
  "TEXT", // Datetime as ISO8601 string
  "TEXT", // Time as HH:MM:SS
  "TEXT", // YearMonth as 'YYYY-MM'
  "INTEGER", // Year as integer
  "TEXT", // Duration as ISO8601 duration string
] as const;

export type SqliteType = (typeof SQLITE_TYPES)[number];

const SQLSERVER_TYPES = [
  "INT",
  "FLOAT",
  "NVARCHAR(MAX)",
  "BIT",
  "DATE",
  "DATETIME2",
  "TIME",
  "CHAR(7)", // Format: 'YYYY-MM'
  "SMALLINT",
  "BIGINT",
] as const;

export type SqlServerType = (typeof SQLSERVER_TYPES)[number];

const ORACLE_TYPES = [
  "NUMBER(38)",
  "BINARY_DOUBLE",
  "CLOB",
  "NUMBER(1)", // Boolean as 0/1
  "DATE",
  "TIMESTAMP",
  "TIMESTAMP", // No pure TIME type
  "VARCHAR2(7)", // Format: 'YYYY-MM'
  "NUMBER(4)",
  "INTERVAL DAY TO SECOND",
] as const;

export type OracleType = (typeof ORACLE_TYPES)[number];

export type DataType = (typeof DATA_TYPES)[number];

type DialectTypes =
  | PostgresType
  | MySqlType
  | SqliteType
  | SqlServerType
  | OracleType;

// Type mappings for each specific dialect
type PostgresSqlTypeMapping = Record<DataType, PostgresType>;
type MySqlSqlTypeMapping = Record<DataType, MySqlType>;
type SqliteSqlTypeMapping = Record<DataType, SqliteType>;
type SqlServerSqlTypeMapping = Record<DataType, SqlServerType>;
type OracleSqlTypeMapping = Record<DataType, OracleType>;

// Type for SQL type mapping
type SqlTypeMapping =
  | PostgresSqlTypeMapping
  | MySqlSqlTypeMapping
  | SqliteSqlTypeMapping
  | SqlServerSqlTypeMapping
  | OracleSqlTypeMapping;

interface DialectTypeMap {
  postgres: PostgresSqlTypeMapping;
  mysql: MySqlSqlTypeMapping;
  sqlite: SqliteSqlTypeMapping;
  sqlserver: SqlServerSqlTypeMapping;
  oracle: OracleSqlTypeMapping;
}

// Constants for better maintainability
export const MAPPING_CONSTANTS = {
  MAX_VARCHAR_LENGTH: 255,
  DEFAULT_TEXT_TYPE: "TEXT",
  DEFAULT_NUMBER_PRECISION: 38,
  ISO8601_DATE_FORMAT: "YYYY-MM-DD",
  ISO8601_DATETIME_FORMAT: "YYYY-MM-DDTHH:mm:ss.sssZ",
} as const;

// Enhanced error class for type mapping errors
export class TypeMappingError extends Error {
  constructor(
    public dialect: Dialect,
    public dataType: string,
    public context?: string,
  ) {
    super(
      `Unsupported type mapping: '${dataType}' for dialect '${dialect}'${
        context ? ` in ${context}` : ""
      }`,
    );
    this.name = "TypeMappingError";
  }
}

// Comprehensive SQL type mappings for each supported dialect
export const SQL_TYPE_MAP: DialectTypeMap = {
  postgres: {
    integer: "INTEGER",
    number: "DOUBLE PRECISION",
    string: "TEXT",
    boolean: "BOOLEAN",
    date: "DATE",
    datetime: "TIMESTAMP WITHOUT TIME ZONE",
    time: "TIME WITHOUT TIME ZONE",
    yearmonth: "DATE", // Could also use TEXT or custom domain
    year: "SMALLINT",
    duration: "INTERVAL",
  },
  mysql: {
    integer: "INT",
    number: "DOUBLE",
    string: "TEXT",
    boolean: "TINYINT(1)",
    date: "DATE",
    datetime: "DATETIME",
    time: "TIME",
    yearmonth: "CHAR(7)", // Format: 'YYYY-MM'
    year: "YEAR", // Stores YYYY
    duration: "BIGINT", // Seconds; could also use VARCHAR for ISO8601
  },
  sqlite: {
    integer: "INTEGER",
    number: "REAL",
    string: "TEXT",
    boolean: "INTEGER", // Convention: 0/1
    date: "TEXT", // ISO8601 strings
    datetime: "TEXT", // ISO8601 strings
    time: "TEXT", // HH:MM:SS format
    yearmonth: "TEXT", // Format: 'YYYY-MM'
    year: "INTEGER",
    duration: "TEXT", // ISO8601 duration format
  },
  sqlserver: {
    integer: "INT",
    number: "FLOAT",
    string: "NVARCHAR(MAX)",
    boolean: "BIT",
    date: "DATE",
    datetime: "DATETIME2",
    time: "TIME",
    yearmonth: "CHAR(7)", // Format: 'YYYY-MM'
    year: "SMALLINT",
    duration: "BIGINT", // Milliseconds; TIME type could also work
  },
  oracle: {
    integer: "NUMBER(38)",
    number: "BINARY_DOUBLE", // More efficient than FLOAT for most cases
    string: "CLOB",
    boolean: "NUMBER(1)", // 0/1 convention
    date: "DATE",
    datetime: "TIMESTAMP",
    time: "TIMESTAMP", // Oracle has no pure TIME type
    yearmonth: "VARCHAR2(7)", // Format: 'YYYY-MM'
    year: "NUMBER(4)",
    duration: "INTERVAL DAY TO SECOND",
  },
} as const;

export function isValidDataType(dataType: string): dataType is DataType {
  return DATA_TYPES.includes(dataType as DataType);
}

// Type mapping for dialect-specific return types
interface DialectTypeReturn {
  postgres: PostgresType;
  mysql: MySqlType;
  sqlite: SqliteType;
  sqlserver: SqlServerType;
  oracle: OracleType;
}

// Get SQL type for a specific data type and dialect with narrowed return types
export function getSqlType<T extends Dialect>(
  dialect: T,
  dataType: string,
): DialectTypeReturn[T] {
  if (!isValidDataType(dataType)) {
    throw new TypeMappingError(dialect, dataType, "getSqlType");
  }

  const dialectTypeMap = SQL_TYPE_MAP[dialect];
  const sqlType = dialectTypeMap[dataType];

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!sqlType) {
    throw new TypeMappingError(dialect, dataType, "getSqlType");
  }

  return sqlType as DialectTypeReturn[T];
}

export interface MappedRelation {
  baseTableName: string;
  baseColumnName: string;
  baseColumnType: DialectTypes;
  foreignTableName: string;
  foreignTableColumn: string;
  foreignTableType: DialectTypes;
}

export interface MapppedColumn {
  column: string;
  type: DialectTypes;
  isPrimaryKey: boolean;
}

// Type-safe mapped relation for specific dialects
export interface PostgresMappedRelation {
  baseTableName: string;
  baseColumnName: string;
  baseColumnType: PostgresType;
  foreignTableName: string;
  foreignTableColumn: string;
  foreignTableType: PostgresType;
}

export interface MySqlMappedRelation {
  baseTableName: string;
  baseColumnName: string;
  baseColumnType: MySqlType;
  foreignTableName: string;
  foreignTableColumn: string;
  foreignTableType: MySqlType;
}

export interface SqliteMappedRelation {
  baseTableName: string;
  baseColumnName: string;
  baseColumnType: SqliteType;
  foreignTableName: string;
  foreignTableColumn: string;
  foreignTableType: SqliteType;
}

export interface SqlServerMappedRelation {
  baseTableName: string;
  baseColumnName: string;
  baseColumnType: SqlServerType;
  foreignTableName: string;
  foreignTableColumn: string;
  foreignTableType: SqlServerType;
}

export interface OracleMappedRelation {
  baseTableName: string;
  baseColumnName: string;
  baseColumnType: OracleType;
  foreignTableName: string;
  foreignTableColumn: string;
  foreignTableType: OracleType;
}

// Validation result type
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Validate a single relation mapping
export function validateRelation(
  relation: ForeignKeyMapping,
): ValidationResult {
  const errors: string[] = [];

  // Validate base column type
  if (!isValidDataType(relation.baseColumnType)) {
    errors.push(
      `Invalid base column type: '${relation.baseColumnType}' for table '${relation.baseTableName}.${relation.baseColumnName}'`,
    );
  }

  // Validate foreign column type
  if (!isValidDataType(relation.foreignTableType)) {
    errors.push(
      `Invalid foreign column type: '${relation.foreignTableType}' for table '${relation.foreignTableName}.${relation.foreignTableColumn}'`,
    );
  }

  // Check for type compatibility (warn if types don't match)
  if (relation.baseColumnType !== relation.foreignTableType) {
    errors.push(
      `Type mismatch in relation: ${relation.baseTableName}.${relation.baseColumnName} (${relation.baseColumnType}) -> ${relation.foreignTableName}.${relation.foreignTableColumn} (${relation.foreignTableType})`,
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function getColumnMappings(
  dialect: Dialect,
  columnTypes: ColumnType[] | null,
): MapppedColumn[] | null {
  if (!columnTypes || columnTypes.length === 0) {
    console.warn("table has no columns defined");
    return null;
  }

  const validationResults = columnTypes.map((col) => ({
    column: col.column,
    validation: isValidDataType(col.type),
  }));

  const invalidColumns = validationResults.filter((r) => !r.validation);

  if (invalidColumns.length > 0) {
    console.error("❌ Type mapping errors:", invalidColumns);
    throw new HTTPException(400, {
      message: "One or more columns have invalid data types.",
    });
  }

  return columnTypes.map((col) => ({
    column: col.column,
    type: getSqlType(dialect, col.type),
    isPrimaryKey: col.isPrimaryKey,
  }));
}

// Main mapping function with enhanced error handling and validation
export function getRelationsMappings(
  dialect: Dialect,
  relations: ForeignKeyMapping[] | null,
): MappedRelation[] | null {
  if (!relations || relations.length === 0) {
    console.warn("No relations provided for mapping.");
    return null;
  }

  // Validate all relations first
  const validationResults = relations.map((relation) => ({
    relation,
    validation: validateRelation(relation),
  }));

  // Collect all errors
  const allErrors = validationResults.filter(
    (result) => !result.validation.isValid,
  );

  if (allErrors.length > 0) {
    // log error object
    console.error("❌ Type mapping errors:", allErrors);
    throw new HTTPException(400, {
      message: "One or more relations have invalid data types.",
    });
  }

  // Perform the mapping
  return relations.map((relation): MappedRelation => {
    try {
      const baseType = getSqlType(dialect, relation.baseColumnType);
      const foreignType = getSqlType(dialect, relation.foreignTableType);

      return {
        baseTableName: relation.baseTableName,
        baseColumnName: relation.baseColumnName,
        baseColumnType: baseType,
        foreignTableName: relation.foreignTableName,
        foreignTableColumn: relation.foreignTableColumn,
        foreignTableType: foreignType,
      };
    } catch (error) {
      if (error instanceof TypeMappingError) {
        throw new TypeMappingError(
          dialect,
          error.dataType,
          `relation ${relation.baseTableName}.${relation.baseColumnName} -> ${relation.foreignTableName}.${relation.foreignTableColumn}`,
        );
      }
      throw error;
    }
  });
}

// Utility function to get all supported data types for a dialect
export function getSupportedDataTypes(dialect: Dialect): DataType[] {
  return DATA_TYPES.filter(
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    (dataType) => SQL_TYPE_MAP[dialect][dataType] !== undefined,
  );
}

// Utility function to get dialect-specific information
export function getDialectInfo(dialect: Dialect) {
  return {
    name: dialect,
    supportedTypes: getSupportedDataTypes(dialect),
    typeMap: SQL_TYPE_MAP[dialect],
  };
}

// Get all available dialects
export function getAvailableDialects(): Dialect[] {
  return [...DIALECTS];
}

export function isValidPostgresType(type: DialectTypes): type is PostgresType {
  return (POSTGRES_TYPES as readonly string[]).includes(type);
}
// Additional utility functions for database type management

/**
 * Generate DDL (Data Definition Language) type definition for a column
 * @param dialect - Target database dialect
 * @param dataType - Universal data type
 * @param options - Additional options for type generation
 */
export function generateColumnType(
  dialect: Dialect,
  dataType: DataType,
  options: {
    nullable?: boolean;
    primaryKey?: boolean;
    unique?: boolean;
    defaultValue?: string;
  } = {},
): string {
  const sqlType = getSqlType(dialect, dataType);
  let definition = sqlType;

  // Add constraints based on options
  if (options.primaryKey) {
    definition += " PRIMARY KEY";
  }

  if (options.unique && !options.primaryKey) {
    definition += " UNIQUE";
  }

  if (options.nullable === false) {
    definition += " NOT NULL";
  }

  if (options.defaultValue !== undefined) {
    definition += ` DEFAULT ${options.defaultValue}`;
  }

  return definition;
}

/**
 * Check if two data types are compatible for foreign key relationships
 * @param baseType - Base table column type
 * @param foreignType - Foreign table column type
 */
export function areTypesCompatible(
  baseType: DataType,
  foreignType: DataType,
): boolean {
  // Exact match is always compatible
  if (baseType === foreignType) {
    return true;
  }

  // Define compatible type groups
  const numericTypes: DataType[] = ["integer", "number", "year"];
  const temporalTypes: DataType[] = [
    "date",
    "datetime",
    "time",
    "yearmonth",
    "duration",
  ];
  const textTypes: DataType[] = ["string"];

  // Check if both types are in the same compatibility group
  const isNumericCompatible =
    numericTypes.includes(baseType) && numericTypes.includes(foreignType);
  const isTemporalCompatible =
    temporalTypes.includes(baseType) && temporalTypes.includes(foreignType);
  const isTextCompatible =
    textTypes.includes(baseType) && textTypes.includes(foreignType);

  return isNumericCompatible || isTemporalCompatible || isTextCompatible;
}

/**
 * Get the most appropriate universal data type for a given SQL type string
 * This is useful for reverse mapping from SQL DDL to universal types
 */
export function inferDataTypeFromSql(
  sqlType: string,
  dialect: Dialect,
): DataType | null {
  const normalizedType = sqlType.toUpperCase().trim();
  const dialectMap = SQL_TYPE_MAP[dialect];

  // Find the data type that maps to this SQL type
  for (const [dataType, mappedSqlType] of Object.entries(dialectMap)) {
    if (mappedSqlType.toUpperCase() === normalizedType) {
      return dataType as DataType;
    }
  }

  // Fallback: try to infer from common patterns
  if (normalizedType.includes("INT")) return "integer";
  if (
    normalizedType.includes("FLOAT") ||
    normalizedType.includes("DOUBLE") ||
    normalizedType.includes("REAL")
  )
    return "number";
  if (normalizedType.includes("BOOL") || normalizedType.includes("BIT")) {
    return "boolean";
  }
  if (normalizedType.includes("DATE") && !normalizedType.includes("TIME")) {
    return "date";
  }
  if (
    normalizedType.includes("TIMESTAMP") ||
    normalizedType.includes("DATETIME")
  )
    return "datetime";
  if (normalizedType.includes("TIME") && !normalizedType.includes("STAMP")) {
    return "time";
  }
  if (
    normalizedType.includes("TEXT") ||
    normalizedType.includes("VARCHAR") ||
    normalizedType.includes("CHAR") ||
    normalizedType.includes("CLOB")
  )
    return "string";

  return null;
}

/**
 * Create a comprehensive mapping report for debugging and documentation
 */
// export function generateMappingReport(
//   dialect: Dialect,
//   relations: ForeignKeyMapping[],
// ): string {
//   const report: string[] = [];
//   report.push(`=== SQL Type Mapping Report for ${dialect.toUpperCase()} ===`);
//   report.push(`Generated at: ${new Date().toISOString()}`);
//   report.push("");

//   // Dialect information
//   const dialectInfo = getDialectInfo(dialect);
//   report.push(`Supported Data Types (${dialectInfo.supportedTypes.length}):`);
//   dialectInfo.supportedTypes.forEach((type) => {
//     report.push(`  ${type} → ${dialectInfo.typeMap[type]}`);
//   });
//   report.push("");

//   // Relations analysis
//   report.push(`Relations Analysis (${relations.length} relations):`);
//   const validationResults = relations.map((relation) => ({
//     relation,
//     validation: validateRelation(relation),
//   }));

//   const validRelations = validationResults.filter((r) => r.validation.isValid);
//   const invalidRelations = validationResults.filter((r) =>
//     !r.validation.isValid
//   );
//   const relationsWithWarnings = validationResults.filter((r) =>
//     r.validation.warnings.length > 0
//   );

//   report.push(`  ✅ Valid: ${validRelations.length}`);
//   report.push(`  ❌ Invalid: ${invalidRelations.length}`);
//   report.push(`  ⚠️  With warnings: ${relationsWithWarnings.length}`);
//   report.push("");

//   // Invalid relations details
//   if (invalidRelations.length > 0) {
//     report.push("Invalid Relations:");
//     invalidRelations.forEach(({ relation, validation }) => {
//       report.push(
//         `  ❌ ${relation.baseTableName}.${relation.baseColumnName} → ${relation.foreignTableName}.${relation.foreignTableColumn}`,
//       );
//       validation.errors.forEach((error) => report.push(`     Error: ${error}`));
//     });
//     report.push("");
//   }

//   // Warnings details
//   if (relationsWithWarnings.length > 0) {
//     report.push("Relations with Warnings:");
//     relationsWithWarnings.forEach(({ relation, validation }) => {
//       report.push(
//         `  ⚠️  ${relation.baseTableName}.${relation.baseColumnName} → ${relation.foreignTableName}.${relation.foreignTableColumn}`,
//       );
//       validation.warnings.forEach((warning) =>
//         report.push(`     Warning: ${warning}`)
//       );
//     });
//     report.push("");
//   }

//   return report.join("\n");
// }

// Export useful constants for external use
export { DATA_TYPES as SUPPORTED_DATA_TYPES, DIALECTS as SUPPORTED_DIALECTS };

/**
 * Default export with the most commonly used functions
 */
export default {
  getRelationsMappings,
  getSqlType,
  isValidDataType,
  validateRelation,
  areTypesCompatible,
  getDialectInfo,
  getAvailableDialects,
  // generateMappingReport,
};
