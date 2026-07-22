// src/query/client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is fresh for 5 minutes, refetch on window focus
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
    },
    mutations: {
      // Customize mutation behavior if needed
    },
  },
});
