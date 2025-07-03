import { createClient } from "@supabase/supabase-js";
import { appEnvVariables } from "../env.js";
const supabaseUrl = appEnvVariables.SUPABASE_URL;
const serviceKey = appEnvVariables.SUPABASE_SERVICE_ROLE;
const supabase = createClient(supabaseUrl, serviceKey);
export {
  serviceKey,
  supabase,
  supabaseUrl
};
