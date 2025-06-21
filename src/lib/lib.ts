import { hc } from "hono/client";
import { type ApiRoutes } from "server/index.ts";
import { supabase, supabaseAnonKey } from "./supabase.ts";

export const { api } = hc<ApiRoutes>(window.location.origin, {
    headers: async () => {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token ?? supabaseAnonKey;
      return {
        apikey: supabaseAnonKey,
        authorization: `Bearer ${token}`,
      };
    },
  });
  