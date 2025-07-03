import { customType } from "drizzle-orm/pg-core";
const citext = customType({
  dataType() {
    return "citext";
  }
});
export {
  citext
};
