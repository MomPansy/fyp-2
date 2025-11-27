import { customType, pgEnum } from "drizzle-orm/pg-core";
const citext = customType({
  dataType() {
    return "citext";
  }
});
const dialects = pgEnum("dialects", [
  "mysql",
  "postgres",
  "sqlite",
  "sqlserver",
  "oracle"
]);
export {
  citext,
  dialects
};
