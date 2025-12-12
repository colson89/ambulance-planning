import { Switch, Route } from "wouter";
import { lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import { ErrorBoundary } from "@/components/error-boundary";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { Loader2 } from "lucide-react";

// Lazy load all pages for better performance
const NotFound = lazy(() => import("@/pages/not-found"));
const AuthPage = lazy(() => import("@/pages/auth-page"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const ShiftPlanner = lazy(() => import("@/pages/shift-planner"));
const Profile = lazy(() => import("@/pages/profile"));
const UserManagement = lazy(() => import("@/pages/user-management"));
const ScheduleGenerator = lazy(() => import("@/pages/schedule-generator"));
const WeekdaySettings = lazy(() => import("@/pages/weekday-settings"));
const Statistics = lazy(() => import("@/pages/statistics"));
const HolidaysManagement = lazy(() => import("@/pages/holidays-management"));
const StationSelect = lazy(() => import("@/pages/station-select"));
const VerdiSettings = lazy(() => import("@/pages/verdi-settings"));
const Integrations = lazy(() => import("@/pages/integrations"));
const Reportage = lazy(() => import("@/pages/reportage"));
const Overtime = lazy(() => import("@/pages/overtime"));
const ActivityLogs = lazy(() => import("@/pages/activity-logs"));
const ShiftSwaps = lazy(() => import("@/pages/shift-swaps"));
const ForgotPassword = lazy(() => import("@/pages/forgot-password"));
const ResetPassword = lazy(() => import("@/pages/reset-password"));
const PushNotifications = lazy(() => import("@/pages/push-notifications"));
const Manual = lazy(() => import("@/pages/manual"));

// Loading component for Suspense boundaries
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-border" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <ProtectedRoute path="/" component={Dashboard} />
        <ProtectedRoute path="/dashboard" component={Dashboard} />
        <ProtectedRoute path="/shifts" component={ShiftPlanner} />
        <ProtectedRoute path="/profile" component={Profile} />
        <ProtectedRoute path="/users" component={UserManagement} />
        <ProtectedRoute path="/schedule" component={ScheduleGenerator} />
        <ProtectedRoute path="/shift-planner" component={ScheduleGenerator} />
        <ProtectedRoute path="/settings" component={WeekdaySettings} />
        <ProtectedRoute path="/statistics" component={Statistics} />
        <ProtectedRoute path="/holidays" component={HolidaysManagement} />
        <ProtectedRoute path="/integrations" component={Integrations} />
        <ProtectedRoute path="/verdi" component={VerdiSettings} />
        <ProtectedRoute path="/reportage" component={Reportage} />
        <ProtectedRoute path="/overtime" component={Overtime} />
        <ProtectedRoute path="/activity-logs" component={ActivityLogs} />
        <ProtectedRoute path="/shift-swaps" component={ShiftSwaps} />
        <ProtectedRoute path="/push-notifications" component={PushNotifications} />
        <ProtectedRoute path="/manual" component={Manual} />
        <Route path="/station-select" component={StationSelect} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router />
          <Toaster />
          <PWAInstallPrompt />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;