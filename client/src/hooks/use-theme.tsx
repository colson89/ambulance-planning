import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "./use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    if (user?.darkMode) {
      setThemeState("dark");
      document.documentElement.classList.add("dark");
    } else {
      setThemeState("light");
      document.documentElement.classList.remove("dark");
    }
  }, [user?.darkMode]);

  const updateThemeMutation = useMutation({
    mutationFn: async (darkMode: boolean) => {
      if (!user) return;
      const res = await apiRequest("PATCH", `/api/users/${user.id}/display-settings`, { darkMode });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    }
  });

  const setTheme = (newTheme: Theme) => {
    const isDark = newTheme === "dark";
    setThemeState(newTheme);
    
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    
    if (user) {
      updateThemeMutation.mutate(isDark);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark: theme === "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
