import type { Dialect } from "server/problem-database/mappings.ts";

export function quoteIdent(dialect: Dialect, name: string): string {
  switch (dialect) {
    case "mysql":
      return `\`${name.replace(/`/g, "``")}\``;
    case "sqlserver":
      return `[${name.replace(/\]/g, "]]")}]`;
    case "sqlite":
      return `"${name.replace(/"/g, '""')}"`;
    case "oracle":
      return `"${name.replace(/"/g, '""')}"`;
    case "postgres":
    default:
      return `"${name.replace(/"/g, '""')}"`;
  }
}

export function isTextType(sqlType: string): boolean {
  const textTypes = [
    "TEXT",
    "VARCHAR",
    "CHAR",
    "NVARCHAR",
    "NCHAR",
    "VARCHAR2",
    "CLOB",
    "NCLOB",
    "LONGTEXT",
    "MEDIUMTEXT",
    "TINYTEXT",
  ];
  return textTypes.some((type) =>
    sqlType.toUpperCase().includes(type.toUpperCase()),
  );
}

export function isBooleanType(sqlType: string): boolean {
  const boolTypes = ["BOOLEAN", "BOOL", "BIT", "TINYINT(1)"];
  return boolTypes.some((type) =>
    sqlType.toUpperCase().includes(type.toUpperCase()),
  );
}

export function isNumericType(sqlType: string): boolean {
  const numericTypes = [
    "INTEGER",
    "INT",
    "BIGINT",
    "SMALLINT",
    "TINYINT",
    "DECIMAL",
    "NUMERIC",
    "FLOAT",
    "DOUBLE",
    "REAL",
    "NUMBER",
    "MONEY",
    "SMALLMONEY",
  ];
  return numericTypes.some((type) =>
    sqlType.toUpperCase().includes(type.toUpperCase()),
  );
}

export function isCountResult(obj: unknown): obj is { count: number } {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "count" in obj &&
    typeof (obj as { count: number }).count === "number"
  );
}

export function isExistsResult(obj: unknown): obj is { exists: boolean } {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "exists" in obj &&
    typeof (obj as { exists: boolean }).exists === "boolean"
  );
}
