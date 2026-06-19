import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { isFullAccess, getSectionAdmin, getAllowedPagePaths, getAccessLabel } from '@/lib/accessControl';
import MobileHeader from './MobileHeader';
import MobileTabBar from './MobileTabBar';
import {
  LayoutDashboard, TrendingUp, Calculator, BarChart3,
  Beef, Truck, Globe, BookOpen, Settings, ShieldAlert, Activity, Menu, X, DollarSign,
  Briefcase, Pill, Zap, Workflow, Shield, ShoppingCart, Scale, ListChecks, Building2,
  Send, Wheat, HeartPulse, Users, Wrench, Brain, Bell
} from 'lucide-react';

// Nav items — the `roles` array is used as a FALLBACK only when a user doesn't match
// the 3-tier page-list logic. Tier 1 (super admins) always see everything.
// Tier 2/3 visibility is driven by getAllowedPagePaths() in the filter below.
const navItemsConfig = [
  { label: 'Dashboard',             icon: LayoutDashboard, path: '/' },
  { label: 'System Health',         icon: Activity,        path: '/system-health' },
  { label: 'System Status',         icon: Activity,        path: '/system-status' },
  { label: 'AI Management',         icon: Workflow,        path: '/ai-management' },
  { label: 'AI Admin Control',      icon: Shield,          path: '/ai-admin' },
  { label: 'Market Inputs',         icon: Activity,        path: '/market' },
  { label: 'ROI Ladder',            icon: Calculator,      path: '/roi-ladder' },
  { label: 'Purchase Calculator',   icon: DollarSign,      path: '/purchase-calculator' },
  { label: 'Cutout Engine',         icon: BarChart3,       path: '/cutout' },
  { label: 'Enterprise Model',      icon: Beef,            path: '/enterprise' },
  { label: 'Weekly Playbook',       icon: TrendingUp,      path: '/playbook' },
  { label: 'Cattle Lots',           icon: Beef,            path: '/lots' },
  { label: 'Operational Programs',  icon: Briefcase,       path: '/programs' },
  { label: 'Entity Financials',     icon: DollarSign,      path: '/entity-financials' },
  { label: 'Financial Intelligence',icon: Building2,       path: '/financial-intelligence' },
  { label: 'Corporate Structure',   icon: Building2,       path: '/corporate-structure' },
  { label: 'Commodity Sourcing',    icon: Wheat,           path: '/commodity-sourcing' },
  { label: 'Field Rep Portal',      icon: Send,            path: '/field-rep' },
  { label: 'Feedlot Ops',           icon: Wheat,           path: '/feedlot-ops' },
  { label: 'Lot Performance',       icon: HeartPulse,      path: '/lot-performance' },
  { label: 'Load Board',            icon: Truck,           path: '/load-board' },
  { label: 'AI Ops Advisor',        icon: Brain,           path: '/ai-ops-advisor' },
  { label: 'AI Feed Planner',       icon: Zap,             path: '/ai-feed-planner' },
  { label: 'Staff Portal',          icon: Users,           path: '/staff-portal' },
  { label: 'Maintenance',           icon: Wrench,          path: '/maintenance' },
  { label: 'Alerts',                icon: Bell,            path: '/alerts' },
  { label: 'Feed & Health',         icon: Pill,            path: '/feed-health' },
  { label: 'Commodity Sourcing',    icon: Wheat,           path: '/commodity-sourcing' },
  { label: 'Trade Analytics',       icon: Globe,           path: '/trade-analytics' },
  { label: 'Carcass Quality',       icon: ShieldAlert,     path: '/carcass-quality' },
  { label: 'Sensitivity',           icon: ShieldAlert,     path: '/sensitivity' },
  { label: 'Trucking',              icon: Truck,           path: '/trucking' },
  { label: 'Global Intel',          icon: Globe,           path: '/global' },
  { label: 'Master Document',       icon: BookOpen,        path: '/document' },
  { label: 'Approvals',             icon: ShieldAlert,     path: '/approvals' },
  { label: 'Sync Monitor',          icon: Zap,             path: '/sync-monitor' },
  { label: 'Platform Docs',         icon: BookOpen,        path: '/platform-docs' },
  { label: 'Settings',              icon: Settings,        path: '/settings' },
  { label: 'Live Marketplace',      icon: ShoppingCart,    path: '/marketplace' },
  { label: 'My Listings',           icon: ListChecks,      path: '/my-listings' },
  { label: 'Legal & Financial',     icon: Scale,           path: '/attorney-portal' },
];

export default function Layout() {
   const location = useLocation();
   const [sidebarOpen, setSidebarOpen] = useState(true);
   const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
   const { user } = useAuth();

  // 3-tier nav filter:
  // Tier 1 (super_admin / Jeff / Lane / Scott) → see everything
  // Tier 2 (division admin) → see their division's pages only
  // Tier 3 (employee) → see only the pages their role allows
  const allowedPaths = getAllowedPagePaths(user);
  const navItems = navItemsConfig.filter(item => {
    if (!user) return false;
    if (isFullAccess(user)) return true;
    if (allowedPaths === 'all') return true;
    return allowedPaths.includes(item.path);
  });

  return (
    <div className="flex h-screen bg-background flex-col md:flex-row overflow-hidden">
      {/* Sidebar - Desktop + Mobile Modal */}
      <aside className={`${mobileMenuOpen ? 'fixed inset-y-0 left-0 z-50 w-56 h-full' : 'hidden'} md:static md:flex ${sidebarOpen ? 'md:w-56' : 'md:w-0'} bg-card border-r border-border flex-col overflow-hidden transition-all duration-300`}>
       {/* Logo */}
       <div className="p-4 border-b border-border flex-shrink-0">
         <div className="flex items-center gap-3">
           <img
             src="https://media.base44.com/images/public/69f4e0f8f8f460e805a3eb84/d924dd25e_IMG_6891.png"
             alt="Continental Cattle Company"
             className="w-12 h-12 object-contain flex-shrink-0"
           />
           <div className="min-w-0">
             <div className="font-bebas text-primary text-sm leading-tight">CONTINENTAL</div>
             <div className="text-muted-foreground text-xs">Cattle Co INC</div>
           </div>
         </div>
       </div>

       {/* Navigation - Scrollable on mobile with touch support */}
       <nav className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 p-2 space-y-1 md:overflow-y-auto touch-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? 'bg-primary/15 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer - Fixed at bottom */}
        <div className="p-3 border-t border-border text-xs text-muted-foreground space-y-1 flex-shrink-0 pb-safe">
          <div className="truncate font-medium text-foreground">{user?.full_name || user?.email}</div>
          <div className="truncate text-xs leading-tight">
            {getAccessLabel(user)}
          </div>
          <div>v1.0 — Live</div>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Header - Shown only on mobile */}
      <MobileHeader onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} mobileMenuOpen={mobileMenuOpen} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col w-full min-h-0 overflow-hidden">
        <div className="flex md:flex items-center gap-2 p-4 border-b border-border bg-card/50">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1 hover:bg-secondary rounded-md transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          {/* Desktop Sidebar Toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:flex p-1 hover:bg-secondary rounded-md transition-colors"
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          </div>
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0 min-h-0">
          <Outlet />
        </div>
      </main>

      {/* Mobile Tab Bar - Shown only on mobile */}
      <MobileTabBar navItems={navItems} location={location} />
    </div>
  );
}