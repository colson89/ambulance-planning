import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { ComponentType, LazyExoticComponent } from "react";

type UserRole = "admin" | "ambulancier" | "supervisor" | "viewer";

export function ProtectedRoute({
  path,
  component: Component,
  allowedRoles,
}: {
  path: string;
  component: ComponentType<any> | LazyExoticComponent<ComponentType<any>>;
  allowedRoles?: UserRole[];
}) {
  const { user, isLoading } = useAuth();

  return (
    <Route path={path}>
      {() => {
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-border" />
            </div>
          );
        }

        if (!user) {
          return <Redirect to="/station-select" />;
        }

        // Check role-based access if allowedRoles is specified
        if (allowedRoles && !allowedRoles.includes(user.role as UserRole)) {
          // Redirect to dashboard if user doesn't have access
          return <Redirect to="/dashboard" />;
        }

        return <Component />;
      }}
    </Route>
  );
}