import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Activity, Beef, MoreHorizontal, X, TrendingUp, Calculator, BarChart3, ShieldAlert, Truck, Globe, BookOpen, CheckSquare, Settings } from 'lucide-react';

const PRIMARY_TABS = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Market', icon: Activity, path: '/market' },
  { label: 'Cattle', icon: Beef, path: '/lots' },
];

const MORE_ITEMS = [
  { label: 'ROI Ladder', icon: Calculator, path: '/roi-ladder' },
  { label: 'Cutout', icon: BarChart3, path: '/cutout' },
  { label: 'Enterprise', icon: Beef, path: '/enterprise' },
  { label: 'Playbook', icon: TrendingUp, path: '/playbook' },
  { label: 'Sensitivity', icon: ShieldAlert, path: '/sensitivity' },
  { label: 'Trucking', icon: Truck, path: '/trucking' },
  { label: 'Global Intel', icon: Globe, path: '/global' },
  { label: 'Document', icon: BookOpen, path: '/document' },
  { label: 'Approvals', icon: CheckSquare, path: '/approvals' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

export default function MobileTabBar() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const isMoreActive = MORE_ITEMS.some(i => i.path === location.pathname);

  return (
    <>
      {/* More drawer */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-card border-t border-border rounded-t-2xl z-50"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <span className="font-bebas text-xl text-primary tracking-wide">MORE</span>
              <button onClick={() => setMoreOpen(false)} className="text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1 p-3">
              {MORE_ITEMS.map(item => {
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMoreOpen(false)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors ${
                      active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {PRIMARY_TABS.map(tab => {
          const active = location.pathname === tab.path;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex-1 flex flex-col items-center gap-1 py-2 transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className={`flex-1 flex flex-col items-center gap-1 py-2 transition-colors ${
            isMoreActive ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>
    </>
  );
}