import {
  Button,
  Paper,
  Text,
  TextInput,
  Title,
  Container,
  PinInput,
  Stack,
  LoadingOverlay,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { z } from "zod";
import { zodResolver } from "mantine-form-zod-resolver";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import classes from "./login.module.css";
import { supabase } from "lib/supabase.ts";
import { showError } from "utils/notifications.tsx";

const redirectUrl = import.meta.env.DEV
  ? "http://localhost:5173"
  : (import.meta.env.VITE_APP_URL as string);

export function Login() {
  const navigate = useNavigate({ from: "/login" });
  const magicLinkForm = useForm({
    mode: "uncontrolled",
    initialValues: {
      email: "",
    },
    validate: zodResolver(z.object({ email: z.string().email() })),
  });

  const verifyOtpForm = useForm({
    mode: "uncontrolled",
    initialValues: {
      token: "",
    },
    validate: zodResolver(z.object({ token: z.string().min(6).max(6) })),
  });

  const sendOtpMutation = useMutation({
    mutationKey: ["auth", "signin", "otp"],
    mutationFn: async (values: typeof magicLinkForm.values) => {
      const { data, error } = await supabase.auth.signInWithOtp({
        email: values.email,
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

  const verifyOtp = useMutation({
    mutationKey: ["auth", "verify", "otp"],
    mutationFn: async (values: typeof verifyOtpForm.values) => {
      const { data, error } = await supabase.auth.verifyOtp({
        email: magicLinkForm.values.email,
        token: values.token,
        type: "email",
        options: {
          redirectTo: redirectUrl,
        },
      });
      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      navigate({ to: "/" });
    },
    onError: (error) => {
      showError(error.message);
    },
  });

  const { isPending: otpPending } = sendOtpMutation;
  const { isPending: verifyPending } = verifyOtp;

  return (
    <form
      onSubmit={magicLinkForm.onSubmit((values) => {
        sendOtpMutation.mutate(values);
      })}
    >
      <Container size={500} my={40}>
        <Title ta="center" className={classes.title}>
          Query Proctor
        </Title>

        <Text className={classes.subtitle}>
          Welcome back! Log into Query Proctor with your email address.
        </Text>

        <Paper withBorder shadow="sm" p={22} mt={20} radius="md">
          {sendOtpMutation.isSuccess ? (
            <Stack align="center">
              <Text>Enter the 6-digit code we sent to your email.</Text>
              <PinInput
                length={6}
                onComplete={(value) => {
                  verifyOtpForm.setFieldValue("token", value);
                  verifyOtp.mutate({ token: value });
                }}
                type="number"
                disabled={verifyPending}
              />
              {verifyPending && <LoadingOverlay />}
            </Stack>
          ) : (
            <>
              <TextInput
                label="Email"
                placeholder="example@email.com"
                required
                radius="md"
                {...magicLinkForm.getInputProps("email")}
              />
              <Button
                fullWidth
                mt="xl"
                radius="md"
                type="submit"
                loading={otpPending}
                disabled={otpPending}
              >
                Sign in
              </Button>
            </>
          )}
        </Paper>
      </Container>
    </form>
  );
}
