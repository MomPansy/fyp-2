import { hc } from "hono/client";
import { type ApiRoutes } from "server/index.ts";
import { supabase, supabaseAnonKey } from "./supabase.ts";

// Helper to attach required auth headers for backend proxy
export async function getAuthHeaders() {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token ?? supabaseAnonKey;
  return {
    apikey: supabaseAnonKey,
    authorization: `Bearer ${token}`,
  } as const;
}

export const { api } = hc<ApiRoutes>(window.location.origin, {
  headers: async () => {
    return await getAuthHeaders();
  },
});
