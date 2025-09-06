import { HTTPException } from "hono/http-exception";
const DIALECTS = [
  "postgres",
  "mysql",
  "sqlite",
  "sqlserver",
  "oracle"
];
const DATA_TYPES = [
  "integer",
  // Whole numbers
  "number",
  // Floating point numbers
  "string",
  // Text data
  "boolean",
  // True/false values
  "date",
  // Date only (no time)
  "datetime",
  // Date and time
  "time",
  // Time only (no date)
  "yearmonth",
  // Year and month (e.g., 2024-03)
  "year",
  // Year only
  "duration"
  // Time intervals/durations
];
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
  "INTERVAL"
];
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
  "BIGINT"
];
const SQLITE_TYPES = [
  "INTEGER",
  "REAL",
  "TEXT",
  "INTEGER",
  // Boolean as 0/1
  "TEXT",
  // Date as ISO8601 string
  "TEXT",
  // Datetime as ISO8601 string
  "TEXT",
  // Time as HH:MM:SS
  "TEXT",
  // YearMonth as 'YYYY-MM'
  "INTEGER",
  // Year as integer
  "TEXT"
  // Duration as ISO8601 duration string
];
const SQLSERVER_TYPES = [
  "INT",
  "FLOAT",
  "NVARCHAR(MAX)",
  "BIT",
  "DATE",
  "DATETIME2",
  "TIME",
  "CHAR(7)",
  // Format: 'YYYY-MM'
  "SMALLINT",
  "BIGINT"
];
const ORACLE_TYPES = [
  "NUMBER(38)",
  "BINARY_DOUBLE",
  "CLOB",
  "NUMBER(1)",
  // Boolean as 0/1
  "DATE",
  "TIMESTAMP",
  "TIMESTAMP",
  // No pure TIME type
  "VARCHAR2(7)",
  // Format: 'YYYY-MM'
  "NUMBER(4)",
  "INTERVAL DAY TO SECOND"
];
const MAPPING_CONSTANTS = {
  MAX_VARCHAR_LENGTH: 255,
  DEFAULT_TEXT_TYPE: "TEXT",
  DEFAULT_NUMBER_PRECISION: 38,
  ISO8601_DATE_FORMAT: "YYYY-MM-DD",
  ISO8601_DATETIME_FORMAT: "YYYY-MM-DDTHH:mm:ss.sssZ"
};
class TypeMappingError extends Error {
  constructor(dialect, dataType, context) {
    super(
      `Unsupported type mapping: '${dataType}' for dialect '${dialect}'${context ? ` in ${context}` : ""}`
    );
    this.dialect = dialect;
    this.dataType = dataType;
    this.context = context;
    this.name = "TypeMappingError";
  }
}
const SQL_TYPE_MAP = {
  postgres: {
    integer: "INTEGER",
    number: "DOUBLE PRECISION",
    string: "TEXT",
    boolean: "BOOLEAN",
    date: "DATE",
    datetime: "TIMESTAMP WITHOUT TIME ZONE",
    time: "TIME WITHOUT TIME ZONE",
    yearmonth: "DATE",
    // Could also use TEXT or custom domain
    year: "SMALLINT",
    duration: "INTERVAL"
  },
  mysql: {
    integer: "INT",
    number: "DOUBLE",
    string: "TEXT",
    boolean: "TINYINT(1)",
    date: "DATE",
    datetime: "DATETIME",
    time: "TIME",
    yearmonth: "CHAR(7)",
    // Format: 'YYYY-MM'
    year: "YEAR",
    // Stores YYYY
    duration: "BIGINT"
    // Seconds; could also use VARCHAR for ISO8601
  },
  sqlite: {
    integer: "INTEGER",
    number: "REAL",
    string: "TEXT",
    boolean: "INTEGER",
    // Convention: 0/1
    date: "TEXT",
    // ISO8601 strings
    datetime: "TEXT",
    // ISO8601 strings
    time: "TEXT",
    // HH:MM:SS format
    yearmonth: "TEXT",
    // Format: 'YYYY-MM'
    year: "INTEGER",
    duration: "TEXT"
    // ISO8601 duration format
  },
  sqlserver: {
    integer: "INT",
    number: "FLOAT",
    string: "NVARCHAR(MAX)",
    boolean: "BIT",
    date: "DATE",
    datetime: "DATETIME2",
    time: "TIME",
    yearmonth: "CHAR(7)",
    // Format: 'YYYY-MM'
    year: "SMALLINT",
    duration: "BIGINT"
    // Milliseconds; TIME type could also work
  },
  oracle: {
    integer: "NUMBER(38)",
    number: "BINARY_DOUBLE",
    // More efficient than FLOAT for most cases
    string: "CLOB",
    boolean: "NUMBER(1)",
    // 0/1 convention
    date: "DATE",
    datetime: "TIMESTAMP",
    time: "TIMESTAMP",
    // Oracle has no pure TIME type
    yearmonth: "VARCHAR2(7)",
    // Format: 'YYYY-MM'
    year: "NUMBER(4)",
    duration: "INTERVAL DAY TO SECOND"
  }
};
function isValidDataType(dataType) {
  return DATA_TYPES.includes(dataType);
}
function getSqlType(dialect, dataType) {
  if (!isValidDataType(dataType)) {
    throw new TypeMappingError(dialect, dataType, "getSqlType");
  }
  const dialectTypeMap = SQL_TYPE_MAP[dialect];
  const sqlType = dialectTypeMap[dataType];
  if (!sqlType) {
    throw new TypeMappingError(dialect, dataType, "getSqlType");
  }
  return sqlType;
}
function validateRelation(relation) {
  const errors = [];
  if (!isValidDataType(relation.baseColumnType)) {
    errors.push(
      `Invalid base column type: '${relation.baseColumnType}' for table '${relation.baseTableName}.${relation.baseColumnName}'`
    );
  }
  if (!isValidDataType(relation.foreignTableType)) {
    errors.push(
      `Invalid foreign column type: '${relation.foreignTableType}' for table '${relation.foreignTableName}.${relation.foreignTableColumn}'`
    );
  }
  if (relation.baseColumnType !== relation.foreignTableType) {
    errors.push(
      `Type mismatch in relation: ${relation.baseTableName}.${relation.baseColumnName} (${relation.baseColumnType}) -> ${relation.foreignTableName}.${relation.foreignTableColumn} (${relation.foreignTableType})`
    );
  }
  return {
    isValid: errors.length === 0,
    errors
  };
}
function getColumnMappings(dialect, columnTypes) {
  if (!columnTypes || columnTypes.length === 0) {
    console.warn("table has no columns defined");
    return null;
  }
  const validationResults = columnTypes.map((col) => ({
    column: col.column,
    validation: isValidDataType(col.type)
  }));
  const invalidColumns = validationResults.filter((r) => !r.validation);
  if (invalidColumns.length > 0) {
    console.error("\u274C Type mapping errors:", invalidColumns);
    throw new HTTPException(400, {
      message: "One or more columns have invalid data types."
    });
  }
  return columnTypes.map((col) => ({
    column: col.column,
    type: getSqlType(dialect, col.type),
    isPrimaryKey: col.isPrimaryKey
  }));
}
function getRelationsMappings(dialect, relations) {
  if (!relations || relations.length === 0) {
    console.warn("No relations provided for mapping.");
    return null;
  }
  const validationResults = relations.map((relation) => ({
    relation,
    validation: validateRelation(relation)
  }));
  const allErrors = validationResults.filter(
    (result) => !result.validation.isValid
  );
  if (allErrors.length > 0) {
    console.error("\u274C Type mapping errors:", allErrors);
    throw new HTTPException(400, {
      message: "One or more relations have invalid data types."
    });
  }
  return relations.map((relation) => {
    try {
      const baseType = getSqlType(dialect, relation.baseColumnType);
      const foreignType = getSqlType(dialect, relation.foreignTableType);
      return {
        baseTableName: relation.baseTableName,
        baseColumnName: relation.baseColumnName,
        baseColumnType: baseType,
        foreignTableName: relation.foreignTableName,
        foreignTableColumn: relation.foreignTableColumn,
        foreignTableType: foreignType
      };
    } catch (error) {
      if (error instanceof TypeMappingError) {
        throw new TypeMappingError(
          dialect,
          error.dataType,
          `relation ${relation.baseTableName}.${relation.baseColumnName} -> ${relation.foreignTableName}.${relation.foreignTableColumn}`
        );
      }
      throw error;
    }
  });
}
function getSupportedDataTypes(dialect) {
  return DATA_TYPES.filter(
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    (dataType) => SQL_TYPE_MAP[dialect][dataType] !== void 0
  );
}
function getDialectInfo(dialect) {
  return {
    name: dialect,
    supportedTypes: getSupportedDataTypes(dialect),
    typeMap: SQL_TYPE_MAP[dialect]
  };
}
function getAvailableDialects() {
  return [...DIALECTS];
}
function isValidPostgresType(type) {
  return POSTGRES_TYPES.includes(type);
}
function generateColumnType(dialect, dataType, options = {}) {
  const sqlType = getSqlType(dialect, dataType);
  let definition = sqlType;
  if (options.primaryKey) {
    definition += " PRIMARY KEY";
  }
  if (options.unique && !options.primaryKey) {
    definition += " UNIQUE";
  }
  if (options.nullable === false) {
    definition += " NOT NULL";
  }
  if (options.defaultValue !== void 0) {
    definition += ` DEFAULT ${options.defaultValue}`;
  }
  return definition;
}
function areTypesCompatible(baseType, foreignType) {
  if (baseType === foreignType) {
    return true;
  }
  const numericTypes = ["integer", "number", "year"];
  const temporalTypes = [
    "date",
    "datetime",
    "time",
    "yearmonth",
    "duration"
  ];
  const textTypes = ["string"];
  const isNumericCompatible = numericTypes.includes(baseType) && numericTypes.includes(foreignType);
  const isTemporalCompatible = temporalTypes.includes(baseType) && temporalTypes.includes(foreignType);
  const isTextCompatible = textTypes.includes(baseType) && textTypes.includes(foreignType);
  return isNumericCompatible || isTemporalCompatible || isTextCompatible;
}
function inferDataTypeFromSql(sqlType, dialect) {
  const normalizedType = sqlType.toUpperCase().trim();
  const dialectMap = SQL_TYPE_MAP[dialect];
  for (const [dataType, mappedSqlType] of Object.entries(dialectMap)) {
    if (mappedSqlType.toUpperCase() === normalizedType) {
      return dataType;
    }
  }
  if (normalizedType.includes("INT")) return "integer";
  if (normalizedType.includes("FLOAT") || normalizedType.includes("DOUBLE") || normalizedType.includes("REAL"))
    return "number";
  if (normalizedType.includes("BOOL") || normalizedType.includes("BIT")) {
    return "boolean";
  }
  if (normalizedType.includes("DATE") && !normalizedType.includes("TIME")) {
    return "date";
  }
  if (normalizedType.includes("TIMESTAMP") || normalizedType.includes("DATETIME"))
    return "datetime";
  if (normalizedType.includes("TIME") && !normalizedType.includes("STAMP")) {
    return "time";
  }
  if (normalizedType.includes("TEXT") || normalizedType.includes("VARCHAR") || normalizedType.includes("CHAR") || normalizedType.includes("CLOB"))
    return "string";
  return null;
}
var mappings_default = {
  getRelationsMappings,
  getSqlType,
  isValidDataType,
  validateRelation,
  areTypesCompatible,
  getDialectInfo,
  getAvailableDialects
  // generateMappingReport,
};
export {
  MAPPING_CONSTANTS,
  SQL_TYPE_MAP,
  DATA_TYPES as SUPPORTED_DATA_TYPES,
  DIALECTS as SUPPORTED_DIALECTS,
  TypeMappingError,
  areTypesCompatible,
  mappings_default as default,
  generateColumnType,
  getAvailableDialects,
  getColumnMappings,
  getDialectInfo,
  getRelationsMappings,
  getSqlType,
  getSupportedDataTypes,
  inferDataTypeFromSql,
  isValidDataType,
  isValidPostgresType,
  validateRelation
};
