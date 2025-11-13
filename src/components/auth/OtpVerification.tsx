import { Stack, Text, PinInput, LoadingOverlay } from "@mantine/core";

interface OtpVerificationProps {
  email: string;
  onComplete: (token: string) => void;
  isLoading?: boolean;
  message?: string;
}

export function OtpVerification({
  email,
  onComplete,
  isLoading = false,
  message,
}: OtpVerificationProps) {
  return (
    <Stack align="center" pos="relative">
      <Text ta="center">
        {message ?? `Enter the 6-digit code we sent to ${email}`}
      </Text>
      <PinInput
        length={6}
        onComplete={onComplete}
        type="number"
        disabled={isLoading}
      />
      {isLoading && <LoadingOverlay visible />}
    </Stack>
  );
}
