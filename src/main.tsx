import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';

import './main.css';

import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';

import { theme } from './theme.ts';
import { routeTree } from './routeTree.gen.ts';

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
    },
  },
});

// Create a new router instance
const router = createRouter({ routeTree, context: { queryClient } });

// Render the app
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const rootElement = document.getElementById('root')!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <MantineProvider theme={theme}>
          <RouterProvider router={router} />
          <Notifications position="top-right" />
        </MantineProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}
