import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import {
  LayoutDashboard, TrendingUp, Calculator, BarChart3,
  Beef, Truck, Globe, BookOpen, Settings, ShieldAlert, Activity, Menu, X, DollarSign,
  Briefcase, Pill, Zap
} from 'lucide-react';

const navItemsConfig = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/', roles: ['super_admin', 'admin', 'manager', 'office_manager', 'user'] },
  { label: 'Market Inputs', icon: Activity, path: '/market', roles: ['super_admin', 'admin', 'manager', 'office_manager', 'user'] },
  { label: 'ROI Ladder', icon: Calculator, path: '/roi-ladder', roles: ['super_admin', 'admin', 'manager', 'user'] },
  { label: 'Purchase Calculator', icon: DollarSign, path: '/purchase-calculator', roles: ['super_admin', 'admin', 'manager', 'user'] },
  { label: 'Cutout Engine', icon: BarChart3, path: '/cutout', roles: ['super_admin', 'admin', 'manager', 'user'] },
  { label: 'Enterprise Model', icon: Beef, path: '/enterprise', roles: ['super_admin', 'admin', 'manager', 'user'] },
  { label: 'Weekly Playbook', icon: TrendingUp, path: '/playbook', roles: ['super_admin', 'admin', 'manager'] },
  { label: 'Cattle Lots', icon: Beef, path: '/lots', roles: ['super_admin', 'admin', 'manager', 'office_manager', 'user'] },
  { label: 'Operational Programs', icon: Briefcase, path: '/programs', roles: ['super_admin', 'admin', 'manager'] },
  { label: 'Entity Financials', icon: DollarSign, path: '/entity-financials', roles: ['super_admin', 'admin', 'attorney_cpa'] },
  { label: 'Feed & Health', icon: Pill, path: '/feed-health', roles: ['super_admin', 'admin', 'manager'] },
  { label: 'Trade Analytics', icon: Globe, path: '/trade-analytics', roles: ['super_admin', 'admin', 'manager', 'user'] },
  { label: 'Carcass Quality', icon: ShieldAlert, path: '/carcass-quality', roles: ['super_admin', 'admin', 'manager'] },
  { label: 'Sensitivity', icon: ShieldAlert, path: '/sensitivity', roles: ['super_admin', 'admin', 'manager'] },
  { label: 'Trucking', icon: Truck, path: '/trucking', roles: ['super_admin', 'admin', 'manager'] },
  { label: 'Global Intel', icon: Globe, path: '/global', roles: ['super_admin', 'admin', 'manager', 'user'] },
  { label: 'Master Document', icon: BookOpen, path: '/document', roles: ['super_admin', 'admin', 'office_manager', 'attorney_cpa'] },
  { label: 'Approvals', icon: ShieldAlert, path: '/approvals', roles: ['super_admin', 'admin'] },
  { label: 'Sync Monitor', icon: Zap, path: '/sync-monitor', roles: ['super_admin', 'admin'] },
  { label: 'Settings', icon: Settings, path: '/settings', roles: ['super_admin', 'admin'] },
];

export default function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user } = useAuth();

  // Filter nav items by user role
  const navItems = navItemsConfig.filter(item => 
    user && item.roles.includes(user.role)
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-56' : 'w-0'} bg-card border-r border-border flex flex-col overflow-hidden transition-all duration-300`}>
        {/* Logo */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded overflow-hidden bg-[#D2782A] flex-shrink-0">
              <img
                src="https://media.base44.com/images/public/69f4e0f8f8f460e805a3eb84/d924dd25e_IMG_6891.png"
                alt="Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="font-bebas text-primary text-sm leading-tight">CONTINENTAL</div>
              <div className="text-muted-foreground text-xs">Cattle Co</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
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

        {/* Footer */}
        <div className="p-3 border-t border-border text-xs text-muted-foreground">
          <div>v1.0 — Live</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        <div className="flex items-center gap-2 p-4 border-b border-border bg-card/50">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-secondary rounded-md transition-colors"
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}