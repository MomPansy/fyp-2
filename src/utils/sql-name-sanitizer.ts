/**
 * SQL Reserved Keywords that cannot be used as unquoted identifiers.
 * This list covers PostgreSQL, MySQL, SQLite, and SQL Server common reserved words.
 */
const SQL_RESERVED_KEYWORDS = new Set([
  // Most common reserved keywords across SQL dialects
  "select",
  "from",
  "where",
  "insert",
  "update",
  "delete",
  "create",
  "drop",
  "alter",
  "table",
  "index",
  "view",
  "database",
  "schema",
  "column",
  "constraint",
  "primary",
  "foreign",
  "key",
  "references",
  "unique",
  "not",
  "null",
  "default",
  "check",
  "and",
  "or",
  "in",
  "is",
  "like",
  "between",
  "exists",
  "case",
  "when",
  "then",
  "else",
  "end",
  "as",
  "on",
  "join",
  "left",
  "right",
  "inner",
  "outer",
  "cross",
  "full",
  "natural",
  "using",
  "order",
  "by",
  "group",
  "having",
  "limit",
  "offset",
  "union",
  "intersect",
  "except",
  "all",
  "distinct",
  "into",
  "values",
  "set",
  "asc",
  "desc",
  "nulls",
  "first",
  "last",
  "true",
  "false",
  "grant",
  "revoke",
  "user",
  "role",
  "admin",
  "public",
  "cascade",
  "restrict",
  "trigger",
  "procedure",
  "function",
  "return",
  "returns",
  "begin",
  "commit",
  "rollback",
  "transaction",
  "savepoint",
  "if",
  "for",
  "while",
  "loop",
  "cursor",
  "fetch",
  "declare",
  "open",
  "close",
  "with",
  "recursive",
  "temporary",
  "temp",
  "global",
  "local",
  "session",
  "current",
  "row",
  "rows",
  "only",
  "type",
  "enum",
  "serial",
  "bigserial",
  "smallserial",
  "integer",
  "int",
  "bigint",
  "smallint",
  "decimal",
  "numeric",
  "real",
  "float",
  "double",
  "precision",
  "boolean",
  "bool",
  "char",
  "varchar",
  "text",
  "date",
  "time",
  "timestamp",
  "interval",
  "array",
  "json",
  "jsonb",
  "uuid",
  "binary",
  "blob",
  "clob",
  "xml",
]);

/**
 * Checks if a name is a SQL reserved keyword
 */
export function isSqlReservedKeyword(name: string): boolean {
  return SQL_RESERVED_KEYWORDS.has(name.toLowerCase());
}

/**
 * Sanitizes a string to be a valid SQL identifier.
 *
 * Rules applied:
 * 1. Convert to lowercase
 * 2. Replace spaces and invalid characters with underscores
 * 3. Remove leading/trailing underscores
 * 4. Collapse multiple consecutive underscores
 * 5. Ensure it starts with a letter (prefix with 'tbl_' if it starts with a number)
 * 6. If it's a reserved keyword, prefix with 'tbl_'
 * 7. Truncate to max length (63 chars for PostgreSQL)
 *
 * @param name - The raw name to sanitize
 * @param maxLength - Maximum length for the identifier (default: 63 for PostgreSQL)
 * @returns A valid SQL identifier
 */
export function sanitizeSqlIdentifier(name: string, maxLength = 63): string {
  if (!name || name.trim() === "") {
    return "unnamed_table";
  }

  let sanitized = name
    // Remove file extension if present
    .replace(/\.[^/.]+$/, "")
    // Convert to lowercase
    .toLowerCase()
    // Replace any character that's not alphanumeric or underscore with underscore
    .replace(/[^a-z0-9_]/g, "_")
    // Collapse multiple consecutive underscores
    .replace(/_+/g, "_")
    // Remove leading and trailing underscores
    .replace(/^_+|_+$/g, "");

  // If empty after sanitization, use default
  if (!sanitized) {
    return "unnamed_table";
  }

  // If starts with a number, prefix with 'tbl_'
  if (/^[0-9]/.test(sanitized)) {
    sanitized = `tbl_${sanitized}`;
  }

  // If it's a reserved keyword, prefix with 'tbl_'
  if (isSqlReservedKeyword(sanitized)) {
    sanitized = `tbl_${sanitized}`;
  }

  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
    // Remove trailing underscore if truncation created one
    sanitized = sanitized.replace(/_+$/, "");
  }

  return sanitized;
}

/**
 * Validates if a name is a valid SQL identifier without modification.
 * Returns validation result with details.
 */
export function validateSqlIdentifier(name: string): {
  isValid: boolean;
  sanitized: string;
  issues: string[];
} {
  const issues: string[] = [];
  const sanitized = sanitizeSqlIdentifier(name);

  if (!name || name.trim() === "") {
    issues.push("Name cannot be empty");
  } else {
    if (name !== sanitized) {
      const nameWithoutExt = name.replace(/\.[^/.]+$/, "");
      if (/[^a-z0-9_]/i.test(nameWithoutExt)) {
        issues.push(
          "Contains invalid characters (only letters, numbers, and underscores allowed)",
        );
      }
      if (/^[0-9]/.test(nameWithoutExt)) {
        issues.push("Cannot start with a number");
      }
      if (isSqlReservedKeyword(nameWithoutExt.toLowerCase())) {
        issues.push(`"${nameWithoutExt}" is a SQL reserved keyword`);
      }
    }
  }

  return {
    isValid: issues.length === 0,
    sanitized,
    issues,
  };
}
