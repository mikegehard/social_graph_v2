import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PipelineProvider } from "@/contexts/PipelineContext";
import PipelineStatusIndicator from "@/components/PipelineStatusIndicator";
import { useMeetingNotifications } from "@/hooks/useMeetingNotifications";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import _Record from "@/pages/Record";
import Contacts from "@/pages/Contacts";
import History from "@/pages/History";
import ConversationDetail from "@/pages/ConversationDetail";
import Settings from "@/pages/Settings";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import PendingContacts from "@/pages/PendingContacts";
import TestAuth from "@/pages/TestAuth";
import UpcomingMeetings from "@/pages/UpcomingMeetings";
import MeetingPrep from "@/pages/MeetingPrep";
import { useEffect } from "react";

// Redirect component for /record route
function RecordRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/");
  }, [setLocation]);
  return null;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return user ? <Component /> : null;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/test-auth" component={TestAuth} />
      <Route path="/">
        {() => <ProtectedRoute component={Home} />}
      </Route>
      <Route path="/record" component={RecordRedirect} />
      <Route path="/contacts">
        {() => <ProtectedRoute component={Contacts} />}
      </Route>
      <Route path="/history">
        {() => <ProtectedRoute component={History} />}
      </Route>
      <Route path="/conversation/:id">
        {() => <ProtectedRoute component={ConversationDetail} />}
      </Route>
      <Route path="/settings">
        {() => <ProtectedRoute component={Settings} />}
      </Route>
      <Route path="/pending">
        {() => <ProtectedRoute component={PendingContacts} />}
      </Route>
      <Route path="/meetings">
        {() => <ProtectedRoute component={UpcomingMeetings} />}
      </Route>
      <Route path="/meetings/:id">
        {() => <ProtectedRoute component={MeetingPrep} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  // Enable meeting notifications for authenticated users only
  useMeetingNotifications();
  
  const style = {
    "--sidebar-width": "16rem",
  };

  return (
    <PipelineProvider>
      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-screen w-full overflow-hidden">
          <AppSidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            <header className="flex items-center justify-between p-2 md:p-4 border-b border-border flex-shrink-0">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <ThemeToggle />
            </header>
            <main className="flex-1 overflow-auto">
              <Router />
            </main>
          </div>
        </div>
      </SidebarProvider>
      <PipelineStatusIndicator />
    </PipelineProvider>
  );
}

function AppContent() {
  const { user } = useAuth();
  const [location] = useLocation();

  const isAuthPage = location === "/login" || location === "/signup" || location === "/forgot-password" || location === "/reset-password" || location === "/test-auth";

  if (isAuthPage || !user) {
    return <Router />;
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
