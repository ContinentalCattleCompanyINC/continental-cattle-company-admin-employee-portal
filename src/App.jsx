import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/ThemeProvider';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import RoleGate from '@/components/RoleGate';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import { AnimatePresence, motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { initOfflineEngine } from '@/lib/offlineEngine';

// Page imports
import Dashboard from './pages/Dashboard';
import MarketInputsPage from './pages/MarketInputs';
import ROILadder from './pages/ROILadder';
import CutoutEngine from './pages/CutoutEngine';
import EnterpriseModel from './pages/EnterpriseModel';
import WeeklyPlaybook from './pages/WeeklyPlaybook';
import CattleLots from './pages/CattleLots';
import Sensitivity from './pages/Sensitivity';
import Trucking from './pages/Trucking';
import GlobalIntel from './pages/GlobalIntel';
import MasterDocument from './pages/MasterDocument';
import Approvals from './pages/Approvals';
import Settings from './pages/Settings';
import PurchaseCalculator from './pages/PurchaseCalculator';
import OperationalPrograms from './pages/OperationalPrograms';
import EntityFinancials from './pages/EntityFinancials';
import FeedAndHealth from './pages/FeedAndHealth';
import BankLinking from './pages/BankLinking';
import TradeAnalytics from './pages/TradeAnalytics';
import Marketplace from './pages/Marketplace';
import CarcassQualityValidation from './pages/CarcassQualityValidation';
import SyncMonitor from './pages/SyncMonitor';
import AIControlCenter from './pages/AIControlCenter';
import MasterControlDashboard from './pages/MasterControlDashboard';
import ValidationDashboard from './pages/ValidationDashboard';
import SystemHealthDashboard from './pages/SystemHealthDashboard';
import AIPlatformManagement from './pages/AIPlatformManagement';
import AIAdminControl from './pages/AIAdminControl';
import LoadBoard from './pages/LoadBoard';
import FinancialIntelligence from './pages/FinancialIntelligence';
import FieldRepPortal from './pages/FieldRepPortal';
import AIFeedPlanner from './pages/AIFeedPlanner';
import StaffPortal from './pages/StaffPortal';
import Maintenance from './pages/Maintenance';
import Alerts from './pages/Alerts';
import AIOpsAdvisor from './pages/AIOpsAdvisor';
import CorporateStructure from './pages/CorporateStructure';
import FeedlotOps from './pages/FeedlotOps';
import LotPerformance from './pages/LotPerformance';
import CommoditySourcing from './pages/CommoditySourcing';
import MyListings from './pages/MyListings';
import AttorneyPortal from './pages/AttorneyPortal';
import PlatformDocumentation from './pages/PlatformDocumentation';
import SystemStatus from './pages/SystemStatus';
import PendingApprovalScreen from './components/PendingApprovalScreen';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

const LoadingScreen = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-border border-t-primary rounded-full animate-spin"></div>
      <div className="font-bebas text-xl text-primary tracking-widest">LOADING CONTINENTAL</div>
    </div>
  </div>
);

const AppRoutes = () => {
  const { user, authError } = useAuth();

  // Handle user_not_registered error globally
  if (authError?.type === 'user_not_registered') return <UserNotRegisteredError />;

  // Block pending accounts
  if (user?.role === 'pending') return <PendingApprovalScreen />;

  const externalPortalMap = {
    buyer: '/marketplace',
    seller: '/my-listings',
    hauler: '/load-board',
    attorney_cpa: '/attorney-portal',
  };
  const externalPortal = user ? externalPortalMap[user.role] : null;

  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* All protected app routes — unauthenticated users go to /login */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} fallback={<LoadingScreen />} />}>
        <Route element={<Layout />}>
          <Route path="/" element={
            externalPortal ? <Navigate to={externalPortal} replace /> :
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Dashboard />
            </motion.div>
          } />
          <Route path="/market" element={<MarketInputsPage />} />
          <Route path="/roi-ladder" element={<ROILadder />} />
          <Route path="/cutout" element={<CutoutEngine />} />
          <Route path="/enterprise" element={<EnterpriseModel />} />
          <Route path="/playbook" element={<WeeklyPlaybook />} />
          <Route path="/lots" element={<CattleLots />} />
          <Route path="/sensitivity" element={<Sensitivity />} />
          <Route path="/trucking" element={<Trucking />} />
          <Route path="/global" element={<GlobalIntel />} />
          <Route path="/document" element={<MasterDocument />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/purchase-calculator" element={<PurchaseCalculator />} />
          <Route path="/programs" element={<OperationalPrograms />} />
          <Route path="/entity-financials" element={<RoleGate requiredRole={['admin', 'financial_admin', 'accountant', 'attorney_cpa', 'manager']}><EntityFinancials /></RoleGate>} />
          <Route path="/feed-health" element={<RoleGate requiredRole={['admin', 'manager', 'feedlot_admin']}><FeedAndHealth /></RoleGate>} />
          <Route path="/trade-analytics" element={<TradeAnalytics />} />
          <Route path="/carcass-quality" element={<RoleGate requiredRole={['admin', 'manager', 'market_admin', 'feedlot_admin']}><CarcassQualityValidation /></RoleGate>} />
          <Route path="/sync-monitor" element={<RoleGate requiredRole={['admin', 'super_admin']}><SyncMonitor /></RoleGate>} />
          <Route path="/ai-control" element={<RoleGate requiredRole={['admin', 'super_admin']}><AIControlCenter /></RoleGate>} />
          <Route path="/master-control" element={<RoleGate requiredRole={['admin', 'super_admin']}><MasterControlDashboard /></RoleGate>} />
          <Route path="/validation" element={<RoleGate requiredRole={['admin', 'super_admin']}><ValidationDashboard /></RoleGate>} />
          <Route path="/system-health" element={<RoleGate requiredRole={['admin', 'super_admin']}><SystemHealthDashboard /></RoleGate>} />
          <Route path="/ai-management" element={<RoleGate requiredRole={['admin', 'super_admin']}><AIPlatformManagement /></RoleGate>} />
          <Route path="/ai-admin" element={<RoleGate requiredRole={['admin', 'super_admin']}><AIAdminControl /></RoleGate>} />
          <Route path="/bank-linking" element={<BankLinking />} />
          <Route path="/financial-intelligence" element={<RoleGate requiredRole={['admin', 'super_admin', 'manager', 'financial_admin', 'accountant']}><FinancialIntelligence /></RoleGate>} />
          <Route path="/field-rep" element={<FieldRepPortal />} />
          <Route path="/corporate-structure" element={<RoleGate requiredRole={['admin', 'super_admin', 'accountant', 'attorney_cpa', 'manager', 'financial_admin']}><CorporateStructure /></RoleGate>} />
          <Route path="/commodity-sourcing" element={<RoleGate requiredRole={['admin', 'super_admin', 'manager', 'feedlot_admin', 'feed_mill']}><CommoditySourcing /></RoleGate>} />
          <Route path="/feedlot-ops" element={<RoleGate requiredRole={['admin', 'super_admin', 'manager', 'feedlot_admin', 'feed_mill', 'feed_truck', 'cowboy']}><FeedlotOps /></RoleGate>} />
          <Route path="/ai-feed-planner" element={<RoleGate requiredRole={['admin', 'super_admin', 'manager', 'feedlot_admin']}><AIFeedPlanner /></RoleGate>} />
          <Route path="/staff-portal" element={<RoleGate requiredRole={['admin', 'super_admin', 'office_manager', 'manager', 'feedlot_admin', 'trucking_admin', 'maintenance_admin', 'financial_admin', 'market_admin', 'staff_admin', 'field_admin']}><StaffPortal /></RoleGate>} />
          <Route path="/maintenance" element={<RoleGate requiredRole={['admin', 'super_admin', 'manager', 'office_manager', 'feedlot_admin', 'maintenance_admin', 'trucking_admin', 'welder', 'maintenance', 'cowboy']}><Maintenance /></RoleGate>} />
          <Route path="/alerts" element={<RoleGate requiredRole={['admin', 'super_admin', 'manager', 'trucking_admin', 'feedlot_admin', 'market_admin']}><Alerts /></RoleGate>} />
          <Route path="/ai-ops-advisor" element={<RoleGate requiredRole={['admin', 'super_admin', 'manager', 'feedlot_admin', 'market_admin']}><AIOpsAdvisor /></RoleGate>} />
          <Route path="/lot-performance" element={<RoleGate requiredRole={['admin', 'super_admin', 'manager', 'feedlot_admin', 'field_admin', 'cowboy', 'field_rep']}><LotPerformance /></RoleGate>} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/load-board" element={<RoleGate requiredRole={['hauler', 'admin', 'super_admin', 'trucking_admin', 'dispatch', 'truck_driver', 'truck_owner', 'manager']}><LoadBoard /></RoleGate>} />
          <Route path="/my-listings" element={<RoleGate requiredRole={['seller', 'admin', 'super_admin', 'field_admin']}><MyListings /></RoleGate>} />
          <Route path="/attorney-portal" element={<RoleGate requiredRole={['attorney_cpa', 'admin', 'super_admin', 'accountant', 'financial_admin']}><AttorneyPortal /></RoleGate>} />
          <Route path="/platform-docs" element={<RoleGate requiredRole={['admin', 'super_admin']}><PlatformDocumentation /></RoleGate>} />
          <Route path="/system-status" element={<RoleGate requiredRole={['admin', 'super_admin']}><SystemStatus /></RoleGate>} />
          <Route path="/commodity-sourcing" element={<RoleGate requiredRole={['admin', 'super_admin', 'manager', 'feedlot_admin', 'feed_mill']}><CommoditySourcing /></RoleGate>} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  // Initialize offline-first resilience engine
  if (typeof window !== 'undefined') {
    initOfflineEngine();
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AppRoutes />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;