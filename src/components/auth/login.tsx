import {
  Button,
  Paper,
  Text,
  TextInput,
  Title,
  Container,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { z } from "zod";
import { zodResolver } from "mantine-form-zod-resolver";
import { useNavigate } from "@tanstack/react-router";
import classes from "./login.module.css";
import { OtpVerification } from "./OtpVerification.tsx";
import { useSendOtp, useVerifyOtp } from "hooks/useOtp.ts";

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

  const sendOtpMutation = useSendOtp();

  const verifyOtp = useVerifyOtp();

  const { isPending: otpPending } = sendOtpMutation;
  const { isPending: verifyPending } = verifyOtp;

  return (
    <form
      onSubmit={magicLinkForm.onSubmit((values) => {
        sendOtpMutation.mutate(values.email);
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
            <OtpVerification
              email={magicLinkForm.values.email}
              onComplete={(token) => {
                verifyOtpForm.setFieldValue("token", token);
                verifyOtp.mutate(
                  {
                    email: magicLinkForm.values.email,
                    token,
                    processInvitation: true,
                  },
                  {
                    onSuccess: () => {
                      navigate({ to: "/" });
                    },
                  },
                );
              }}
              isLoading={verifyPending}
            />
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
