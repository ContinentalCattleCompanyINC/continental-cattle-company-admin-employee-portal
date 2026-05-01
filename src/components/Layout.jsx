import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, TrendingUp, Calculator, BarChart3,
  Beef, Truck, ShieldAlert, Globe, BookOpen, Menu, X,
  ChevronRight, Activity
} from 'lucide-react';

const navItems = [
  { label: 'Command Center', icon: LayoutDashboard, path: '/' },
  { label: 'Market Inputs', icon: Activity, path: '/market' },
  { label: 'ROI Ladder', icon: Calculator, path: '/roi-ladder' },
  { label: 'Cutout Engine', icon: BarChart3, path: '/cutout' },
  { label: 'Enterprise Model', icon: Beef, path: '/enterprise' },
  { label: 'Weekly Playbook', icon: TrendingUp, path: '/playbook' },
  { label: 'Cattle Lots', icon: Beef, path: '/lots' },
  { label: 'Sensitivity', icon: ShieldAlert, path: '/sensitivity' },
  { label: 'Trucking', icon: Truck, path: '/trucking' },
  { label: 'Global Intel', icon: Globe, path: '/global' },
  { label: 'Master Document', icon: BookOpen, path: '/document' },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 flex-shrink-0 bg-card border-r border-border flex flex-col`}>
        {/* Logo */}
        <div className="p-4 border-b border-border flex items-center gap-3">
          <div className="w-10 h-10 flex-shrink-0 rounded overflow-hidden bg-[#D2782A]">
            <img
              src="https://media.base44.com/images/public/69f4e0f8f8f460e805a3eb84/d924dd25e_IMG_6891.png"
              alt="CCC Logo"
              className="w-full h-full object-cover"
            />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <div className="font-bebas text-primary text-lg leading-none">Continental Cattle Co</div>
              <div className="text-muted-foreground text-xs">Lane Beeson · Jeff Lewey</div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all group ${
                  active
                    ? 'bg-primary/15 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-primary' : ''}`} />
                {sidebarOpen && (
                  <span className="text-sm font-medium truncate">{item.label}</span>
                )}
                {sidebarOpen && active && <ChevronRight className="w-3 h-3 ml-auto text-primary" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        {sidebarOpen && (
          <div className="p-4 border-t border-border">
            <div className="text-xs text-muted-foreground">2026 Master System</div>
            <div className="text-xs text-primary mt-0.5">v1.0 — Live</div>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}