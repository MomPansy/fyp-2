import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
const problems = pgTable("problems", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  answer: jsonb("answer"),
  created_at: timestamp("created_at", {
    precision: 3,
    withTimezone: true
  }).$default(() => /* @__PURE__ */ new Date()),
  updated_at: timestamp("updated_at", { precision: 3, withTimezone: true }).$default(() => /* @__PURE__ */ new Date()).$onUpdate(() => /* @__PURE__ */ new Date()),
  archived_at: timestamp("archived_at", { precision: 3, withTimezone: true })
});
export {
  problems
};
