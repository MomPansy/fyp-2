import { createClient } from "@supabase/supabase-js";
import { type Database } from "database.gen.ts";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string; 
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);