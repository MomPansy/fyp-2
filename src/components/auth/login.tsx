
import {
  Button,
  Paper,
  Text,
  TextInput,
  Title,
  Container,
} from '@mantine/core';
import classes from './login.module.css';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { z } from 'zod';
import { zodResolver } from 'mantine-form-zod-resolver';
import { supabase } from 'lib/supabase.ts';
import { showError } from 'utils/notifications.tsx';
import { useMutation } from '@tanstack/react-query';

const redirectUrl = import.meta.env.VITE_APP_URL || window.location.origin;

export function Login() {
  const magicLinkForm = useForm({
    mode: 'uncontrolled',
    initialValues: {
      email: '',
    },
    validate: zodResolver(z.object({ email: z.string().email() })),
  });

  const magicLinkMutation = useMutation({
    mutationKey: ['auth', 'signin', 'magic-link'],
    mutationFn: async (values: typeof magicLinkForm.values) => {
      const { data, error } = await supabase.auth.signInWithOtp({
        email: values.email,
        options: {
          emailRedirectTo: redirectUrl,
        }
      });
      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      magicLinkForm.reset();
      notifications.show({
        title: 'Check your email',
        message: 'We sent you a login link. Check your email inbox.',
        color: 'green',
      });
    },
    onError: (error) => {
      showError(error.message);
    },
  });


  return (
    <form onSubmit={magicLinkForm.onSubmit((values) => {
      magicLinkMutation.mutate(values);
    })}>
      <Container size={500} my={40}>
        <Title ta="center" className={classes.title}>
          Query Proctor
        </Title>

        <Text className={classes.subtitle} >
          Welcome back! Log into Query Proctor with your email address.
        </Text>

        <Paper withBorder shadow="sm" p={22} mt={20} radius="md">
          {magicLinkMutation.isSuccess ? (
            <Text ta="center" mb={20}>
              Check your email for the magic link to log in.
            </Text>
          ) : (
            <>
              <TextInput label="Email" placeholder="example@email.com" required radius="md" {...magicLinkForm.getInputProps('email')} />
              <Button fullWidth mt="xl" radius="md" type='submit'>
                Sign in
              </Button>
            </>
          )}
        </Paper>
      </Container>
    </form>
  );
}
