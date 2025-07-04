import {
  queryOptions,
  useMutation,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { jwtDecode } from "jwt-decode";
import { type JwtPayload } from "server/zod/jwt.ts";
import { supabase } from "lib/supabase.ts";
import { showError } from "utils/notifications";
import { createContext, useContext } from "react";
import { type User } from "@supabase/supabase-js";
import { Database } from "@/database.gen";

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

export function useUser() {
  return useSuspenseQuery(accessTokenQueryOptions).data.payload.user_metadata;
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
        },
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

interface UserContextProps {
  id: string;
  email: string;
}

export const UserContext = createContext<
  UserContextProps | undefined
>(undefined);

export const useUserContext = () => {
  const user = useContext(UserContext);
  if (!user) {
    throw new Error("useUserContext must be used within a UserProvider");
  }
  return user;
};
