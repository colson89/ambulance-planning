import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      try {
        // Get selected station from sessionStorage
        const stationData = sessionStorage.getItem("selectedStation");
        if (!stationData) {
          throw new Error("Geen station geselecteerd. Ga terug naar de startpagina.");
        }
        
        const selectedStation = JSON.parse(stationData);
        const loginData = {
          ...credentials,
          stationId: selectedStation.id
        };
        
        const res = await apiRequest("POST", "/api/login", loginData);
        if (res.status === 401) {
          throw new Error("Gebruikersnaam of wachtwoord onjuist voor dit station.");
        }
        if (!res.ok) {
          throw new Error(`Login mislukt (${res.status})`);
        }
        return await res.json();
      } catch (error: any) {
        // Gedetailleerde error afhandelen
        const errorMessage = error.message || "Onbekende fout tijdens inloggen";
        throw new Error(errorMessage);
      }
    },
    onSuccess: (user: SelectUser) => {
      // Clear entire cache to prevent cross-user contamination
      queryClient.clear();
      
      // Force clear any persisted cache/localStorage (safety measure)
      try {
        localStorage.removeItem('__REACT_QUERY_STATE__');
        localStorage.removeItem('react-query-state');
      } catch (e) { /* ignore */ }
      
      // Clear sessionStorage except selectedStation (needed for login)
      // This prevents old user data from bleeding into new session
      try {
        const selectedStation = sessionStorage.getItem('selectedStation');
        sessionStorage.clear();
        if (selectedStation) {
          sessionStorage.setItem('selectedStation', selectedStation);
        }
      } catch (e) { /* ignore */ }
      
      // Explicitly remove all shift-related queries
      queryClient.removeQueries({ queryKey: ['/api/shifts'] });
      queryClient.removeQueries({ queryKey: ['/api/preferences'] });
      
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Ingelogd",
        description: `Welkom ${user.firstName || user.username}!`,
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Inloggen mislukt",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      
      // Clear shift-related cache data to prevent stale data between different users
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/preferences"] });
      queryClient.invalidateQueries({ queryKey: ["/api/statistics"] });
      
      // Clear sessionStorage to remove station selection and any other session data
      try {
        sessionStorage.clear();
      } catch (e) { /* ignore */ }
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
