import { ForeignKeyMapping } from "server/drizzle/_custom";

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

export type DataType = (typeof DATA_TYPES)[number];

// Type for SQL type mapping
type SqlTypeMapping = Record<DataType, string>;

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
export const SQL_TYPE_MAP: Record<Dialect, SqlTypeMapping> = {
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

// Utility functions for validation and type checking
export function isValidDialect(dialect: string): dialect is Dialect {
  return DIALECTS.includes(dialect as Dialect);
}

export function isValidDataType(dataType: string): dataType is DataType {
  return DATA_TYPES.includes(dataType as DataType);
}

// Get SQL type for a specific data type and dialect
export function getSqlType(dialect: Dialect, dataType: string): string {
  if (!isValidDataType(dataType)) {
    throw new TypeMappingError(dialect, dataType, "getSqlType");
  }

  const typeMap = SQL_TYPE_MAP[dialect];
  const sqlType = typeMap[dataType];

  if (!sqlType) {
    throw new TypeMappingError(dialect, dataType, "getSqlType");
  }

  return sqlType;
}

// Enhanced mapping result type
export interface MappedRelation {
  baseTableName: string;
  baseColumnName: string;
  baseColumnType: string;
  foreignTableName: string;
  foreignTableColumn: string;
  foreignTableType: string;
}

// Validation result type
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Validate a single relation mapping
export function validateRelation(
  dialect: Dialect,
  relation: ForeignKeyMapping,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

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
    warnings.push(
      `Type mismatch in relation: ${relation.baseTableName}.${relation.baseColumnName} (${relation.baseColumnType}) -> ${relation.foreignTableName}.${relation.foreignTableColumn} (${relation.foreignTableType})`,
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// Main mapping function with enhanced error handling and validation
export function getMappings(
  dialect: Dialect,
  relations: ForeignKeyMapping[],
): MappedRelation[] {
  // Validate dialect
  if (!isValidDialect(dialect)) {
    throw new TypeMappingError(dialect, "unknown", "dialect validation");
  }

  // Validate all relations first
  const validationResults = relations.map((relation) => ({
    relation,
    validation: validateRelation(dialect, relation),
  }));

  // Collect all errors
  const allErrors = validationResults
    .filter((result) => !result.validation.isValid)
    .flatMap((result) => result.validation.errors);

  if (allErrors.length > 0) {
    throw new Error(`Validation failed:\n${allErrors.join("\n")}`);
  }

  // Log warnings if any
  const allWarnings = validationResults
    .flatMap((result) => result.validation.warnings);

  if (allWarnings.length > 0) {
    console.warn("⚠️ Type mapping warnings:", allWarnings);
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
  return DATA_TYPES.filter((dataType) =>
    SQL_TYPE_MAP[dialect][dataType] !== undefined
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
  const isNumericCompatible = numericTypes.includes(baseType) &&
    numericTypes.includes(foreignType);
  const isTemporalCompatible = temporalTypes.includes(baseType) &&
    temporalTypes.includes(foreignType);
  const isTextCompatible = textTypes.includes(baseType) &&
    textTypes.includes(foreignType);

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
    normalizedType.includes("FLOAT") || normalizedType.includes("DOUBLE") ||
    normalizedType.includes("REAL")
  ) return "number";
  if (normalizedType.includes("BOOL") || normalizedType.includes("BIT")) {
    return "boolean";
  }
  if (normalizedType.includes("DATE") && !normalizedType.includes("TIME")) {
    return "date";
  }
  if (
    normalizedType.includes("TIMESTAMP") || normalizedType.includes("DATETIME")
  ) return "datetime";
  if (normalizedType.includes("TIME") && !normalizedType.includes("STAMP")) {
    return "time";
  }
  if (
    normalizedType.includes("TEXT") || normalizedType.includes("VARCHAR") ||
    normalizedType.includes("CHAR") || normalizedType.includes("CLOB")
  ) return "string";

  return null;
}

/**
 * Create a comprehensive mapping report for debugging and documentation
 */
export function generateMappingReport(
  dialect: Dialect,
  relations: ForeignKeyMapping[],
): string {
  const report: string[] = [];
  report.push(`=== SQL Type Mapping Report for ${dialect.toUpperCase()} ===`);
  report.push(`Generated at: ${new Date().toISOString()}`);
  report.push("");

  // Dialect information
  const dialectInfo = getDialectInfo(dialect);
  report.push(`Supported Data Types (${dialectInfo.supportedTypes.length}):`);
  dialectInfo.supportedTypes.forEach((type) => {
    report.push(`  ${type} → ${dialectInfo.typeMap[type]}`);
  });
  report.push("");

  // Relations analysis
  report.push(`Relations Analysis (${relations.length} relations):`);
  const validationResults = relations.map((relation) => ({
    relation,
    validation: validateRelation(dialect, relation),
  }));

  const validRelations = validationResults.filter((r) => r.validation.isValid);
  const invalidRelations = validationResults.filter((r) =>
    !r.validation.isValid
  );
  const relationsWithWarnings = validationResults.filter((r) =>
    r.validation.warnings.length > 0
  );

  report.push(`  ✅ Valid: ${validRelations.length}`);
  report.push(`  ❌ Invalid: ${invalidRelations.length}`);
  report.push(`  ⚠️  With warnings: ${relationsWithWarnings.length}`);
  report.push("");

  // Invalid relations details
  if (invalidRelations.length > 0) {
    report.push("Invalid Relations:");
    invalidRelations.forEach(({ relation, validation }) => {
      report.push(
        `  ❌ ${relation.baseTableName}.${relation.baseColumnName} → ${relation.foreignTableName}.${relation.foreignTableColumn}`,
      );
      validation.errors.forEach((error) => report.push(`     Error: ${error}`));
    });
    report.push("");
  }

  // Warnings details
  if (relationsWithWarnings.length > 0) {
    report.push("Relations with Warnings:");
    relationsWithWarnings.forEach(({ relation, validation }) => {
      report.push(
        `  ⚠️  ${relation.baseTableName}.${relation.baseColumnName} → ${relation.foreignTableName}.${relation.foreignTableColumn}`,
      );
      validation.warnings.forEach((warning) =>
        report.push(`     Warning: ${warning}`)
      );
    });
    report.push("");
  }

  return report.join("\n");
}

// Export useful constants for external use
export { DATA_TYPES as SUPPORTED_DATA_TYPES, DIALECTS as SUPPORTED_DIALECTS };

/**
 * Default export with the most commonly used functions
 */
export default {
  getMappings,
  getSqlType,
  isValidDialect,
  isValidDataType,
  validateRelation,
  areTypesCompatible,
  getDialectInfo,
  getAvailableDialects,
  generateMappingReport,
};
