import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof Error && /unauthorized|401/i.test(error.message)) {
          return false;
        }

        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
    },
  },
});
