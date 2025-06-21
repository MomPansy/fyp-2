import { useState, useLayoutEffect, useRef } from 'react';
import {
    Button,
    Checkbox,
    Paper,
    PasswordInput,
    Text,
    TextInput,
    Title,
    ButtonProps,
    Stack,
    Tabs,
    FloatingIndicator
} from '@mantine/core';
import classes from './login.module.css';

import { useNavigate } from "@tanstack/react-router";
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { Link } from '@tanstack/react-router';
import { z } from 'zod';
import { zodResolver } from 'mantine-form-zod-resolver';
import { supabase } from 'lib/supabase.ts';
import { showError } from 'utils/notifications.tsx';
import { useMutation } from '@tanstack/react-query';

const redirectUrl = import.meta.env.VITE_APP_URL || window.location.origin;

export function Login() {
    const [activeTab, setActiveTab] = useState<string | null>('magic-link');
    const rootRef = useRef<HTMLDivElement | null>(null);
    const controlsRefs = useRef<Record<string, HTMLButtonElement | null>>({});

    const [refsReady, setRefsReady] = useState(false);

    // Use layout effect to ensure the tabs initialize properly
    useLayoutEffect(() => {
        // Check if both refs needed for the indicator are available
        if (rootRef.current && controlsRefs.current['magic-link']) {
            setRefsReady(true);
        }
    }, [rootRef.current, controlsRefs.current['magic-link']]);


    const magicLinkForm = useForm({
        mode: 'uncontrolled',
        initialValues: {
            email: '',
        },
        validate: zodResolver(z.object({ email: z.string().email() })),
    });

    const passwordForm = useForm({
        mode: 'uncontrolled',
        initialValues: {
            email: '',
            password: '',
        },
        validate: zodResolver(z.object({
            email: z.string().email(),
            password: z.string().min(1, "Password is required"),
        })),
    });

    const navigate = useNavigate();

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

    const passwordMutation = useMutation({
        mutationKey: ['auth', 'signin', 'password'],
        mutationFn: async (values: typeof passwordForm.values) => {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: values.email,
                password: values.password,
            });
            if (error) {
                throw error;
            }
            return data;
        },
        onSuccess: () => {
            passwordForm.reset();
            navigate({
                to: '/',
            }); // Redirect to home or dashboard
        },
        onError: (error) => {
            showError(error.message);
        },
    });

    const thirdPartyMutation = useMutation({
        mutationKey: ['auth', 'signin', 'google'],
        mutationFn: async () => {
            const { data, error } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: 'your-id-token'
            })

            if (error) {
                throw error;
            }
            return data;
        },
        onSuccess: () => {
            passwordForm.reset();
            navigate({
                to: '/',
            }); // Redirect to home or dashboard
        },
        onError: (error) => {
            showError(error.message);
        },
    });

    return (
        <div className={classes.wrapper}>
            <Paper className={classes.form} radius={0} p={30}>
                <Title order={2} className={classes.title} ta="center" mt="md" mb={50}>
                    Welcome back to [INSERT APP NAME]!
                </Title>

                <Tabs value={activeTab} onChange={setActiveTab} variant="none" className={classes.list}
                >
                    <Tabs.List ref={rootRef} mb="md">
                        <Tabs.Tab
                            value="magic-link"
                            ref={(node) => {
                                controlsRefs.current['magic-link'] = node;
                            }}
                            className={classes.tab}
                        >
                            Magic Link
                        </Tabs.Tab>
                        <Tabs.Tab
                            value="password"
                            ref={(node) => {
                                controlsRefs.current['password'] = node;
                            }}
                            className={classes.tab}

                        >
                            Email & Password
                        </Tabs.Tab>

                        {refsReady && (
                            <FloatingIndicator
                                target={controlsRefs.current[activeTab || 'magic-link']}
                                parent={rootRef.current}
                                className={classes.indicator}
                            />
                        )}
                    </Tabs.List>

                    <Tabs.Panel value="magic-link">
                        <form onSubmit={magicLinkForm.onSubmit((values) => {
                            magicLinkMutation.mutate(values);
                        })}>
                            <TextInput
                                label="Email address"
                                placeholder="hello@gmail.com"
                                size="md"
                                {...magicLinkForm.getInputProps('email')}
                            />

                            <Button
                                type='submit'
                                fullWidth
                                size="md"
                                mt="xl"
                                loading={magicLinkMutation.isPending}
                            >
                                Send Magic Link
                            </Button>
                        </form>
                    </Tabs.Panel>

                    <Tabs.Panel value="password">
                        <form onSubmit={passwordForm.onSubmit((values) => {
                            passwordMutation.mutate(values);
                        })}>
                            <TextInput
                                label="Email address"
                                placeholder="hello@gmail.com"
                                size="md"
                                {...passwordForm.getInputProps('email')}
                            />
                            <PasswordInput
                                label="Password"
                                placeholder="Your password"
                                mt="md"
                                size="md"
                                {...passwordForm.getInputProps('password')}
                            />
                            <Checkbox label="Keep me logged in" mt="xl" size="md" />

                            <Button
                                type='submit'
                                fullWidth
                                size="md"
                                mt="xl"
                                loading={passwordMutation.isPending}
                            >
                                Login
                            </Button>
                        </form>
                    </Tabs.Panel>
                </Tabs>

                <Stack mt={'xl'}>
                    <GoogleButton fullWidth size="md" onClick={() => { thirdPartyMutation.mutate() }} loading={thirdPartyMutation.isPending}>
                        Login With Google
                    </GoogleButton>
                </Stack>

                <Text ta="center" mt="md">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-hf-blue hover:text-blue-700 font-bold">
                        Register
                    </Link>
                </Text>
            </Paper>
        </div>
    );
}

function GoogleIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid"
            viewBox="0 0 256 262"
            style={{ width: 14, height: 14 }}
            {...props}
        >
            <path
                fill="#4285F4"
                d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
            />
            <path
                fill="#34A853"
                d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
            />
            <path
                fill="#FBBC05"
                d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
            />
            <path
                fill="#EB4335"
                d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
            />
        </svg>
    );
}

function GoogleButton(props: ButtonProps & React.ComponentPropsWithoutRef<'button'>) {
    return <Button leftSection={<GoogleIcon />} variant="default" {...props} />;
}