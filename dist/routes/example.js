import { factory } from "../factory.js";
const route = factory.createApp().get(
  "/example",
  (c) => c.json({ message: "Hello from example route!" })
);
export {
  route
};
