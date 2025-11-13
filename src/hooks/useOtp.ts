import { useMutation } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { supabase } from "lib/supabase.ts";
import { showError } from "utils/notifications.tsx";
import { api } from "lib/api.ts";

const redirectUrl = import.meta.env.DEV
  ? "http://localhost:5173"
  : (import.meta.env.VITE_APP_URL as string);

export interface VerifyOtpParams {
  email: string;
  token: string;
  processInvitation?: boolean;
  redirectTo?: string;
}

/**
 * Hook to send OTP to an email address
 */
export function useSendOtp() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });
      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      notifications.show({
        title: "Check your email",
        message: "We sent you a one time OTP. Check your email inbox.",
        color: "green",
      });
    },
    onError: (error) => {
      showError(error.message);
    },
  });
}

/**
 * Hook to verify OTP token
 */
export function useVerifyOtp() {
  return useMutation({
    mutationFn: async ({
      email,
      token,
      processInvitation,
    }: VerifyOtpParams) => {
      const { data: otpData, error: otpError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
        options: {
          redirectTo: redirectUrl,
        },
      });
      if (otpError) {
        throw otpError;
      }

      const user = otpData.user;
      if (!user?.email) {
        throw new Error("No email found for user.");
      }

      // Only process invitation if explicitly requested
      if (processInvitation) {
        const response = await api.auth["process-invitation"].$post();

        if (!response.ok) {
          const errorMessage = await response.text();
          throw new Error(errorMessage);
        }
      }

      return otpData;
    },
    onError: (error) => {
      showError(error.message);
    },
  });
}
