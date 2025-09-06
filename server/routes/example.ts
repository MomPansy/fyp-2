import { factory } from "server/factory.ts";

export const route = factory
  .createApp()
  .get("/example", (c) => c.json({ message: "Hello from example route!" }));
