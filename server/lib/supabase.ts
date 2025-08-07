import { createClient } from "@supabase/supabase-js";
import { type Database } from "../../src/database.local.ts";
import { appEnvVariables } from "server/env.ts";

export const supabaseUrl = appEnvVariables.SUPABASE_URL;
export const serviceKey = appEnvVariables.SUPABASE_SERVICE_ROLE;

export const supabase = createClient<Database>(supabaseUrl, serviceKey);
