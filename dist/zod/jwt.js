import { z } from "zod";
const jwtPayloadSchema = z.object({
  aal: z.string(),
  amr: z.array(
    z.object({
      method: z.string(),
      timestamp: z.number()
    })
  ),
  app_metadata: z.object({
    provider: z.string(),
    providers: z.array(z.string())
  }),
  aud: z.union([z.string(), z.array(z.string())]),
  // Can be string or array
  email: z.string(),
  exp: z.number().refine((val) => val > Date.now() / 1e3, {
    message: "expired"
  }),
  iat: z.number(),
  is_anonymous: z.boolean(),
  iss: z.string(),
  phone: z.string().optional(),
  // Make phone optional since it can be empty
  role: z.string(),
  session_id: z.string(),
  sub: z.string().describe("user_id, uuid format"),
  user_metadata: z.object({
    email: z.string(),
    email_verified: z.boolean(),
    phone_verified: z.boolean(),
    role: z.string(),
    sub: z.string(),
    user_id: z.string()
  })
});
export {
  jwtPayloadSchema
};
