import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
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

const queryClient = new QueryClient();

const RefreshRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
      const navEntry = navEntries[0] as PerformanceNavigationTiming;
      if (navEntry.type === 'reload' && location.pathname !== '/') {
        navigate('/', { replace: true });
      }
    }
  }, [navigate, location.pathname]);

  return null;
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
              <RefreshRedirect />
              <Routes>
                {/* Landlord Auth & Routes */}
                <Route path="/auth" element={<Auth />} />
                <Route path="/subscribe" element={<ProtectedRoute><ChoosePlan /></ProtectedRoute>} />
                <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
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