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
const SmtpSettings = lazy(() => import("@/pages/smtp-settings"));
const Overtime = lazy(() => import("@/pages/overtime"));
const ActivityLogs = lazy(() => import("@/pages/activity-logs"));
const ShiftSwaps = lazy(() => import("@/pages/shift-swaps"));
const Stations = lazy(() => import("@/pages/stations"));
const ForgotPassword = lazy(() => import("@/pages/forgot-password"));
const ResetPassword = lazy(() => import("@/pages/reset-password"));
const PushNotifications = lazy(() => import("@/pages/push-notifications"));
const Manual = lazy(() => import("@/pages/manual"));
const Pricing = lazy(() => import("@/pages/pricing"));
const Kiosk = lazy(() => import("@/pages/kiosk"));

// Loading component for Suspense boundaries
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-border" />
    </div>
  );
}

// Role definitions for route access
const ADMIN_ROLES = ["admin", "supervisor"] as const;
const NON_VIEWER_ROLES = ["admin", "supervisor", "ambulancier"] as const;

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Dashboard and Profile - accessible by all authenticated users including viewers */}
        <ProtectedRoute path="/" component={Dashboard} />
        <ProtectedRoute path="/dashboard" component={Dashboard} />
        <ProtectedRoute path="/profile" component={Profile} />
        <ProtectedRoute path="/manual" component={Manual} />
        
        {/* Ambulancier features - NOT accessible by viewers */}
        <ProtectedRoute path="/shifts" component={ShiftPlanner} allowedRoles={[...NON_VIEWER_ROLES]} />
        <ProtectedRoute path="/overtime" component={Overtime} allowedRoles={[...NON_VIEWER_ROLES]} />
        <ProtectedRoute path="/shift-swaps" component={ShiftSwaps} allowedRoles={[...NON_VIEWER_ROLES]} />
        
        {/* Admin/Supervisor only features */}
        <ProtectedRoute path="/users" component={UserManagement} allowedRoles={[...ADMIN_ROLES]} />
        <ProtectedRoute path="/schedule" component={ScheduleGenerator} allowedRoles={[...ADMIN_ROLES]} />
        <ProtectedRoute path="/shift-planner" component={ScheduleGenerator} allowedRoles={[...ADMIN_ROLES]} />
        <ProtectedRoute path="/settings" component={WeekdaySettings} allowedRoles={[...ADMIN_ROLES]} />
        <ProtectedRoute path="/statistics" component={Statistics} allowedRoles={[...ADMIN_ROLES]} />
        <ProtectedRoute path="/holidays" component={HolidaysManagement} allowedRoles={[...ADMIN_ROLES]} />
        <ProtectedRoute path="/integrations" component={Integrations} allowedRoles={[...ADMIN_ROLES]} />
        <ProtectedRoute path="/verdi" component={VerdiSettings} allowedRoles={[...ADMIN_ROLES]} />
        <ProtectedRoute path="/reportage" component={Reportage} allowedRoles={[...ADMIN_ROLES]} />
        <ProtectedRoute path="/smtp-settings" component={SmtpSettings} allowedRoles={[...ADMIN_ROLES]} />
        <ProtectedRoute path="/activity-logs" component={ActivityLogs} allowedRoles={[...ADMIN_ROLES]} />
        <ProtectedRoute path="/stations" component={Stations} allowedRoles={[...ADMIN_ROLES]} />
        <ProtectedRoute path="/push-notifications" component={PushNotifications} allowedRoles={[...ADMIN_ROLES]} />
        
        {/* Public routes */}
        <Route path="/station-select" component={StationSelect} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/kiosk/:token" component={Kiosk} />
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