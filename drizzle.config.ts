/**
 * Used locally by the `drizzle-kit` CLI to generate migration files
 */

import { defineConfig } from 'drizzle-kit';
import { appEnvVariables } from './server/env.ts';

export default defineConfig({
  dialect: 'postgresql',
  schema: 'server/drizzle/*.ts',
  schemaFilter: ['public'],
  out: 'server/drizzle/migrations', 
  dbCredentials: {
    url: appEnvVariables.DB_URL,
    ssl: true,
  },
  breakpoints: false,
});
