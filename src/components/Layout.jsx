import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, TrendingUp, Calculator, BarChart3,
  Beef, Truck, Globe, BookOpen, Settings, ShieldAlert, Activity, Menu, X, DollarSign,
  Briefcase, Pill
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Market Inputs', icon: Activity, path: '/market' },
  { label: 'ROI Ladder', icon: Calculator, path: '/roi-ladder' },
  { label: 'Purchase Calculator', icon: DollarSign, path: '/purchase-calculator' },
  { label: 'Cutout Engine', icon: BarChart3, path: '/cutout' },
  { label: 'Enterprise Model', icon: Beef, path: '/enterprise' },
  { label: 'Weekly Playbook', icon: TrendingUp, path: '/playbook' },
  { label: 'Cattle Lots', icon: Beef, path: '/lots' },
  { label: 'Operational Programs', icon: Briefcase, path: '/programs' },
  { label: 'Entity Financials', icon: DollarSign, path: '/entity-financials' },
  { label: 'Feed & Health', icon: Pill, path: '/feed-health' },
  { label: 'Trade Analytics', icon: Globe, path: '/trade-analytics' },
  { label: 'Sensitivity', icon: ShieldAlert, path: '/sensitivity' },
  { label: 'Trucking', icon: Truck, path: '/trucking' },
  { label: 'Global Intel', icon: Globe, path: '/global' },
  { label: 'Master Document', icon: BookOpen, path: '/document' },
  { label: 'Approvals', icon: ShieldAlert, path: '/approvals' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

export default function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

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