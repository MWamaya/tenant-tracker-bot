import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DataProvider } from "@/context/DataContext";
import { AuthProvider } from "@/hooks/useAuth";
import { SuperAdminProvider } from "@/hooks/useSuperAdmin";
import { ImpersonationProvider } from "@/hooks/useImpersonation";
import ProtectedRoute from "@/components/ProtectedRoute";
import SuperAdminRoute from "@/components/SuperAdminRoute";
import Index from "./pages/Index";
import Properties from "./pages/Properties";
import PropertyDetail from "./pages/PropertyDetail";
import Houses from "./pages/Houses";
import Tenants from "./pages/Tenants";
import Payments from "./pages/Payments";
import Reports from "./pages/Reports";
import EmailLogs from "./pages/EmailLogs";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ChoosePlan from "./pages/ChoosePlan";
import Landing from "./pages/Landing";
import { useAuth } from "@/hooks/useAuth";

// Super Admin Pages
import SuperAdminLogin from "./pages/super-admin/SuperAdminLogin";
import SuperAdminDashboard from "./pages/super-admin/SuperAdminDashboard";
import LandlordsPage from "./pages/super-admin/LandlordsPage";
import SubscriptionsPage from "./pages/super-admin/SubscriptionsPage";
import AuditLogsPage from "./pages/super-admin/AuditLogsPage";
import GlobalPaymentsPage from "./pages/super-admin/GlobalPaymentsPage";
import SettingsPage from "./pages/super-admin/SettingsPage";
import SuperAdminPropertiesPage from "./pages/super-admin/PropertiesPage";

const queryClient = new QueryClient();

/**
 * Fixes a Radix UI bug where `pointer-events: none` is occasionally left
 * stuck on <body> after a Dialog/AlertDialog closes (especially when nested
 * inputs had focus). Without this guard the whole app appears frozen —
 * sidebar links and tabs stop responding to clicks until a page refresh.
 */
const BodyPointerEventsGuard = () => {
  useEffect(() => {
    const clearStuckPointerEvents = () => {
      if (document.body.style.pointerEvents === 'none') {
        const openOverlay = document.querySelector(
          '[data-state="open"][role="dialog"], [data-state="open"][role="alertdialog"]'
        );
        if (!openOverlay) {
          document.body.style.pointerEvents = '';
        }
      }
    };
    const observer = new MutationObserver(clearStuckPointerEvents);
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    const interval = window.setInterval(clearStuckPointerEvents, 500);
    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);
  return null;
};

const RootRoute = () => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  return user ? <ProtectedRoute><Index /></ProtectedRoute> : <Navigate to="/auth" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <SuperAdminProvider>
          <ImpersonationProvider>
          <DataProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <BodyPointerEventsGuard />
              <Routes>
                {/* Landlord Auth & Routes */}
                <Route path="/auth" element={<Auth />} />
                <Route path="/subscribe" element={<ProtectedRoute><ChoosePlan /></ProtectedRoute>} />
                <Route path="/" element={<RootRoute />} />
                <Route path="/properties" element={<ProtectedRoute><Properties /></ProtectedRoute>} />
                <Route path="/property" element={<ProtectedRoute><PropertyDetail /></ProtectedRoute>} />
                <Route path="/houses" element={<ProtectedRoute><Houses /></ProtectedRoute>} />
                <Route path="/tenants" element={<ProtectedRoute><Tenants /></ProtectedRoute>} />
                <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                <Route path="/email-logs" element={<ProtectedRoute><EmailLogs /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                
                {/* Super Admin Routes */}
                <Route path="/super-admin/login" element={<SuperAdminLogin />} />
                <Route path="/super-admin" element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} />
                <Route path="/super-admin/landlords" element={<SuperAdminRoute><LandlordsPage /></SuperAdminRoute>} />
                <Route path="/super-admin/subscriptions" element={<SuperAdminRoute><SubscriptionsPage /></SuperAdminRoute>} />
                <Route path="/super-admin/payments" element={<SuperAdminRoute><GlobalPaymentsPage /></SuperAdminRoute>} />
                <Route path="/super-admin/audit-logs" element={<SuperAdminRoute><AuditLogsPage /></SuperAdminRoute>} />
                <Route path="/super-admin/settings" element={<SuperAdminRoute><SettingsPage /></SuperAdminRoute>} />
                <Route path="/super-admin/properties" element={<SuperAdminRoute><SuperAdminPropertiesPage /></SuperAdminRoute>} />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </DataProvider>
          </ImpersonationProvider>
        </SuperAdminProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;