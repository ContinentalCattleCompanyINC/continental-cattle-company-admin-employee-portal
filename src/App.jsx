import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from '@/components/Layout';

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
import TradeAnalytics from './pages/TradeAnalytics';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-border border-t-primary rounded-full animate-spin"></div>
          <div className="font-bebas text-xl text-primary tracking-widest">LOADING CONTINENTAL</div>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    else if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
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
        <Route path="/entity-financials" element={<EntityFinancials />} />
        <Route path="/feed-health" element={<FeedAndHealth />} />
        <Route path="/trade-analytics" element={<TradeAnalytics />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;