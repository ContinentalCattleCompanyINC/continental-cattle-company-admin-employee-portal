import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const PAGE_TITLES = {
  '/': 'Command Center',
  '/market': 'Market Inputs',
  '/roi-ladder': 'ROI Ladder',
  '/cutout': 'Cutout Engine',
  '/enterprise': 'Enterprise Model',
  '/playbook': 'Weekly Playbook',
  '/lots': 'Cattle Lots',
  '/sensitivity': 'Sensitivity',
  '/trucking': 'Trucking',
  '/global': 'Global Intel',
  '/document': 'Master Document',
  '/approvals': 'Approvals',
  '/settings': 'Settings',
};

export default function MobileHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const isRoot = location.pathname === '/';
  const title = PAGE_TITLES[location.pathname] || 'Continental';

  return (
    <div
      className="md:hidden flex items-center h-12 px-4 bg-card border-b border-border flex-shrink-0"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {!isRoot && (
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-primary mr-3"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">Back</span>
        </button>
      )}
      <span className="font-bebas text-lg text-foreground tracking-wide flex-1 text-center mr-10">
        {isRoot ? 'CONTINENTAL CATTLE CO' : title.toUpperCase()}
      </span>
    </div>
  );
}