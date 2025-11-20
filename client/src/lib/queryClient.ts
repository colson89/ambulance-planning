import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Helper function to create user-friendly error messages in Dutch
function getUserFriendlyErrorMessage(status: number, responseText: string): string {
  switch (status) {
    case 401:
      return "Uw sessie is verlopen. Log opnieuw in.";
    case 403:
      return "U heeft geen toegang tot deze functie.";
    case 404:
      return "De gevraagde gegevens zijn niet gevonden.";
    case 408:
      return "De aanvraag duurde te lang. Probeer het opnieuw.";
    case 409:
      return "Er is een conflict met bestaande gegevens.";
    case 422:
      return "De ingevoerde gegevens zijn ongeldig.";
    case 429:
      return "Te veel aanvragen. Wacht even en probeer opnieuw.";
    case 500:
      return "Er is een serverfout opgetreden. Probeer het later opnieuw.";
    case 502:
    case 503:
    case 504:
      return "De server is tijdelijk niet bereikbaar. Probeer het later opnieuw.";
    default:
      // Try to parse JSON error message from server
      try {
        const parsed = JSON.parse(responseText);
        if (parsed.message) {
          return parsed.message;
        }
      } catch {
        // Not JSON, use as-is if it's a reasonable length
        if (responseText && responseText.length < 200) {
          return responseText;
        }
      }
      return `Er is een fout opgetreden (${status})`;
  }
}

// Custom error class that preserves HTTP status code
export class HttpError extends Error {
  status: number;
  
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'HttpError';
  }
}

// Helper to handle 401 errors globally
function handleUnauthorized() {
  // Dispatch custom event for session expiry
  window.dispatchEvent(new CustomEvent('session-expired'));
  
  // Clear all session data except selectedStation
  const selectedStation = sessionStorage.getItem('selectedStation');
  sessionStorage.clear();
  if (selectedStation) {
    sessionStorage.setItem('selectedStation', selectedStation);
  }
  
  // Redirect to station select page
  window.location.href = '/station-select';
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    // Handle 401 globally
    if (res.status === 401) {
      handleUnauthorized();
      throw new HttpError(res.status, getUserFriendlyErrorMessage(res.status, text));
    }
    
    // Throw custom error with status code preserved
    throw new HttpError(res.status, getUserFriendlyErrorMessage(res.status, text));
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true, // Refetch wanneer window focus krijgt
      staleTime: 0, // Data is altijd stale voor maximale frisheid
      // Smart retry logic: retry on network errors, but not on 4xx errors
      retry: (failureCount, error) => {
        // Check if this is our custom HttpError with status code
        if (error instanceof HttpError) {
          // Don't retry on 4xx errors (client errors) - these won't succeed on retry
          if (error.status >= 400 && error.status < 500) {
            return false;
          }
        }
        
        // Retry up to 2 times for network errors and server errors (5xx)
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff: 1s, 2s, max 30s
    },
    mutations: {
      // Don't retry mutations by default to avoid duplicate submissions
      retry: false,
    },
  },
});
