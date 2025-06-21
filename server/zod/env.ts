import { z } from 'zod'

export const appEnvVariablesSchema = z.object({
    SUPABASE_ANON_KEY: z.string(),
    SUPABASE_JWT_SECRET: z.string(),
    SUPABASE_SERVICE_ROLE: z.string(),
    DB_URL: z.string(),
})

export type AppEnvVariables = z.infer<typeof appEnvVariablesSchema>;