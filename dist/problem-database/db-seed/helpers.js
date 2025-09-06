function quoteIdent(dialect, name) {
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
function isTextType(sqlType) {
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
    "TINYTEXT"
  ];
  return textTypes.some(
    (type) => sqlType.toUpperCase().includes(type.toUpperCase())
  );
}
function isBooleanType(sqlType) {
  const boolTypes = ["BOOLEAN", "BOOL", "BIT", "TINYINT(1)"];
  return boolTypes.some(
    (type) => sqlType.toUpperCase().includes(type.toUpperCase())
  );
}
function isNumericType(sqlType) {
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
    "SMALLMONEY"
  ];
  return numericTypes.some(
    (type) => sqlType.toUpperCase().includes(type.toUpperCase())
  );
}
function isCountResult(obj) {
  return typeof obj === "object" && obj !== null && "count" in obj && typeof obj.count === "number";
}
function isExistsResult(obj) {
  return typeof obj === "object" && obj !== null && "exists" in obj && typeof obj.exists === "boolean";
}
export {
  isBooleanType,
  isCountResult,
  isExistsResult,
  isNumericType,
  isTextType,
  quoteIdent
};
