import { customType, pgEnum } from "drizzle-orm/pg-core";

export const citext = customType<{
  data: string;
  notNull: true;
  default: false;
}>({
  dataType() {
    return "citext";
  },
});

export interface ColumnType {
  column: string;
  type: string;
  isPrimaryKey: boolean;
}

export interface ForeignKeyMapping {
  baseTableName: string;
  baseColumnName: string;
  baseColumnType: string;
  foreignTableName: string;
  foreignTableColumn: string;
  foreignTableType: string;
}

export const dialects = pgEnum("dialects", [
  "mysql",
  "postgres",
  "sqlite",
  "sqlserver",
  "oracle",
]);