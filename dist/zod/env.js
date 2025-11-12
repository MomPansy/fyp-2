import { z } from "zod";
const appEnvVariablesSchema = z.object({
  SUPABASE_URL: z.string(),
  SUPABASE_ANON_KEY: z.string(),
  SUPABASE_JWT_SECRET: z.string(),
  SUPABASE_SERVICE_ROLE: z.string(),
  DB_URL: z.string(),
  // Optional base URL for the Python/Flask service (e.g. http://flask-app:5002)
  FLASK_URL: z.string(),
  // SMTP configuration for sending emails (used in development)
  SMTP_HOST: z.string().default("127.0.0.1"),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  // Gmail SMTP configuration (used in production)
  GMAIL_USER: z.string().optional(),
  GMAIL_APP_PASSWORD: z.string().optional(),
  // Node environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development")
});
export {
  appEnvVariablesSchema
};
