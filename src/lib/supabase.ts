import { createClient } from "@supabase/supabase-js";
import { type Database } from "database.types.ts";

export const supabaseUrl = import.meta.env.DEV
    ? "http://127.0.0.1:54321"
    : import.meta.env.VITE_SUPABASE_URL as string;
export const supabaseAnonKey = import.meta.env.DEV
    ? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
    : import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
