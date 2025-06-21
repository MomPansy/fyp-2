import { z } from 'zod';

export const jwtPayloadSchema = z.object({
  exp: z.number().refine((val) => val > Date.now() / 1000, {
    message: 'expired',
  }),
  sub: z.string().describe('user_id, uuid format'),
  email: z.string(),
  role: z.string().describe('anon, authenticated, or service_role'),
});
export type JwtPayload = z.infer<typeof jwtPayloadSchema>;
