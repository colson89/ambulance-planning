import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import ShiftPlanner from "@/pages/shift-planner";
import Profile from "@/pages/profile";
import UserManagement from "@/pages/user-management";
import ScheduleGenerator from "@/pages/schedule-generator";
import WeekdaySettings from "@/pages/weekday-settings";
import Statistics from "@/pages/statistics";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/shifts" component={ShiftPlanner} />
      <ProtectedRoute path="/profile" component={Profile} />
      <ProtectedRoute path="/users" component={UserManagement} />
      <ProtectedRoute path="/schedule" component={ScheduleGenerator} />
      <ProtectedRoute path="/settings" component={WeekdaySettings} />
      <ProtectedRoute path="/statistics" component={Statistics} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;