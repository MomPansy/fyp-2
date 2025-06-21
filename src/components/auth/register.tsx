import {
    Anchor,
    Button,
    Paper,
    PasswordInput,
    Text,
    TextInput,
    Title,
    Stack
} from '@mantine/core';
import classes from './login.module.css';
import { useNavigate } from "@tanstack/react-router";
import { Link } from '@tanstack/react-router';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useMutation } from '@tanstack/react-query';
import { supabase } from 'lib/supabase.ts';
import { showError } from 'utils/notifications.tsx';
import { z } from 'zod';
import { zodResolver } from 'mantine-form-zod-resolver';

const redirectUrl = import.meta.env.VITE_APP_URL || window.location.origin;


export function Register() {
    const form = useForm({
        initialValues: {
            email: '',
            password: '',
            confirmPassword: ''
        },
        validate: zodResolver(
            z.object({
                email: z.string().email('Invalid email'),
                password: z.string().min(6, 'Password must be at least 6 characters'),
                confirmPassword: z.string()
            }).refine(data => data.password === data.confirmPassword, {
                message: 'Passwords do not match',
                path: ['confirmPassword']
            })
        )
    });

    const navigate = useNavigate();

    const registerMutation = useMutation({
        mutationKey: ['auth', 'signup'],
        mutationFn: async (values: typeof form.values) => {
            const { data, error } = await supabase.auth.signUp({
                email: values.email,
                password: values.password,
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
            form.reset();
            notifications.show({
                title: 'Registration successful',
                message: 'Please check your email to confirm your account.',
                color: 'green'
            });
            
            // You can navigate to login or a confirmation page
            navigate({
                to: '/login',
            });
        },
        onError: (error) => {
            showError(error.message);
        }
    });

    return (
        <div className={classes.wrapper}>
            <Paper className={classes.form} radius={0} p={30}>
                <Title order={2} className={classes.title} ta="center" mt="md" mb={50}>
                    Create your account
                </Title>

                <form onSubmit={form.onSubmit((values) => registerMutation.mutate(values))}>
                    <TextInput 
                        label="Email address" 
                        placeholder="hello@gmail.com" 
                        size="md" 
                        {...form.getInputProps('email')} 
                    />
                    <PasswordInput 
                        label="Password" 
                        placeholder="Your password" 
                        mt="md" 
                        size="md" 
                        {...form.getInputProps('password')}
                    />
                    <PasswordInput 
                        label="Confirm Password" 
                        placeholder="Confirm your password" 
                        mt="md" 
                        size="md" 
                        {...form.getInputProps('confirmPassword')}
                    />
                    
                    <Button 
                        type='submit' 
                        fullWidth 
                        size="md" 
                        mt="xl"
                        loading={registerMutation.isPending}
                    >
                        Register
                    </Button>
                </form>

                <Text ta="center" mt="md">
                    Already have an account?{' '}
                    <Link to="/login" className="text-hf-blue hover:text-blue-700 font-bold">
                        Login
                    </Link>
                </Text>
            </Paper>
        </div>
    );
}