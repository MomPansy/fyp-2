import {
  useMutation,
  queryOptions,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { jwtDecode } from "jwt-decode";
import { type JwtPayload } from "server/zod/jwt.ts";
import { supabase } from "lib/supabase.ts";
import { showError } from "utils/notifications"; 

export const accessTokenQueryOptions = queryOptions<{
  raw: string;
  payload: JwtPayload;
}>({
  queryKey: ["accessToken"],
  queryFn: async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw error;
    }
    if (!data.session) {
      throw new Error("No session found");
    }
    const accessToken = data.session.access_token;
    const payload = jwtDecode<JwtPayload>(accessToken);
    return { raw: accessToken, payload };
  },
});

export function useAccessToken() {
  return useSuspenseQuery(accessTokenQueryOptions);
}

export function useSignInWithEmailAndPassword() {
  return useMutation({
    mutationKey: ["auth", "signin", "signInWithEmailAndPassword"],
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        throw error;
      }
      return data;
    },
    onError: (error) => {
      showError(error.message);
    },
  });
}

export function useSignInWithOTP() {
  return useMutation({
    mutationKey: ["auth", "signin", "signInWithOTP"],
    mutationFn: async ({ email }: { email: string }) => {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            emailRedirectTo: window.location.origin,
        }
      });
      if (error) {
        throw error;
      }
      return data;
    },
    onError: (error) => {
      showError(error.message);
    },
  });
}
