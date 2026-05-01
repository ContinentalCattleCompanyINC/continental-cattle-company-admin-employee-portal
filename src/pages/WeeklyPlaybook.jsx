import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import SectionHeader from '@/components/SectionHeader';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, AlertTriangle, Eye, Shield, ShoppingCart } from 'lucide-react';

const PLAYBOOK_DATA = {
  buy: [
    '350–550 lb calves (Holstein, Beef × Dairy)',
    '1100–1500 lb cows',
    '1400–1800 lb bulls',
    '700–900 lb Beef × Dairy feeders',
  ],
  sell: [
    '2000–2250 lb bulls',
    '1650–1850 lb cows',
    '1450–1600 lb Beef × Dairy steers',
  ],
  feed: [
    '1100→1650 lb cows',
    '1400→2100 lb bulls',
    '700→1000 lb Beef × Dairy steers',
  ],
  avoid: [
    'Finishing Holsteins past 1450 lb',
    'Buying 550–700 lb Holsteins',
    'Feeding 400→900 lb Holsteins (unless internal transfer)',
  ],
  hedge: [
    'Aug LC if basis weak',
    'GF if feeder market overheated',
    'Corn puts if price above $4.80',
  ],
  watch: [
    '90s trim imports from Australia',
    'Short plate exports to Korea',
    'Box beef movement (Choice/Prime)',
    'USDA weekly slaughter report',
    'Corn futures spreads',
  ],
};

const DECISION_TREE = [
  { condition: 'ROI > 12%', action: 'BUY', color: 'success' },
  { condition: 'ROI 5–12%', action: 'CONDITIONAL BUY', color: 'warning' },
  { condition: 'ROI < 5%', action: 'AVOID', color: 'danger' },
  { condition: 'Next 150-lb step ROI > 5%', action: 'KEEP FEEDING', color: 'success' },
  { condition: 'Next 150-lb step ROI < 3%', action: 'SELL NOW', color: 'danger' },
  { condition: 'COG < $0.95/lb + Basis OK', action: 'BUY FEEDERS', color: 'success' },
  { condition: 'Cutout spread > $80', action: 'PACKERS BIDDING UP', color: 'success' },
  { condition: 'Cutout spread < $60', action: 'HOLD MARKETINGS', color: 'warning' },
  { condition: '90s trim strong + cows light', action: 'PUSH COWS TO MARKET', color: 'success' },
];

const SENSITIVITY = [
  { factor: 'COG –20%', roiImpact: '+8–12%', color: 'success' },
  { factor: 'COG –10%', roiImpact: '+4–6%', color: 'success' },
  { factor: 'COG Base', roiImpact: '—', color: 'muted' },
  { factor: 'COG +10%', roiImpact: '–4–6%', color: 'danger' },
  { factor: 'COG +20%', roiImpact: '–8–12%', color: 'danger' },
  { factor: 'Basis +$3/cwt', roiImpact: '+4–6%', color: 'success' },
  { factor: 'Basis –$3/cwt', roiImpact: '–4–6%', color: 'danger' },
  { factor: 'Cutout +$20/cwt', roiImpact: '+8–12%', color: 'success' },
  { factor: 'Cutout –$20/cwt', roiImpact: '–8–12%', color: 'danger' },
  { factor: 'Grid +$10/cwt', roiImpact: '+6–10%', color: 'success' },
  { factor: '90s Trim +$0.50/lb', roiImpact: '+6–10% (cows)', color: 'success' },
  { factor: 'DL +1%', roiImpact: '–3–5%', color: 'danger' },
  { factor: 'Dress% +1.5%', roiImpact: '+4–7%', color: 'success' },
];

export default function WeeklyPlaybook() {
  const { data: market } = useQuery({
    queryKey: ['marketInputs'],
    queryFn: () => base44.entities.MarketInputs.list('-date', 1),
    initialData: [],
  });

  const latest = market?.[0] || {};
  const lc = latest.lc_futures || 241.66;
  const trim = latest.trim_90s || 3.15;
  const cutout = latest.choice_cutout || 324.50;
  const spread = cutout - lc;

  return (
    <div className="p-6 space-y-6">
      <SectionHeader
        title="WEEKLY PLAYBOOK"
        subtitle="Buy/Sell/Feed signals + Sensitivity + Decision Tree — Sections 37–47"
        badge={format(new Date(), 'MMM d, yyyy')}
      />

      {/* Market Context */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`p-3 rounded-lg border text-center ${lc > 235 ? 'bg-success/10 border-success/20' : 'bg-warning/10 border-warning/20'}`}>
          <div className="text-xs text-muted-foreground">LC Signal</div>
          <div className={`font-bebas text-2xl ${lc > 235 ? 'text-success' : 'text-warning'}`}>${lc}</div>
          <div className="text-xs">{lc > 235 ? 'Premium Window' : 'Monitor'}</div>
        </div>
        <div className={`p-3 rounded-lg border text-center ${trim > 3.0 ? 'bg-success/10 border-success/20' : 'bg-danger/10 border-danger/20'}`}>
          <div className="text-xs text-muted-foreground">90s Trim</div>
          <div className={`font-bebas text-2xl ${trim > 3.0 ? 'text-success' : 'text-danger'}`}>${trim}/lb</div>
          <div className="text-xs">{trim > 3.0 ? 'Sell Cows/Bulls' : 'Hold'}</div>
        </div>
        <div className={`p-3 rounded-lg border text-center ${spread > 80 ? 'bg-success/10 border-success/20' : 'bg-warning/10 border-warning/20'}`}>
          <div className="text-xs text-muted-foreground">Cutout Spread</div>
          <div className={`font-bebas text-2xl ${spread > 80 ? 'text-success' : 'text-warning'}`}>${spread.toFixed(1)}</div>
          <div className="text-xs">{spread > 80 ? 'Packers Bidding Up' : 'Tight'}</div>
        </div>
      </div>

      {/* Signals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'BUY THIS WEEK', items: PLAYBOOK_DATA.buy, color: 'success', icon: ShoppingCart },
          { label: 'SELL THIS WEEK', items: PLAYBOOK_DATA.sell, color: 'primary', icon: TrendingUp },
          { label: 'FEED THIS WEEK', items: PLAYBOOK_DATA.feed, color: 'warning', icon: TrendingUp },
          { label: 'AVOID', items: PLAYBOOK_DATA.avoid, color: 'danger', icon: AlertTriangle },
          { label: 'HEDGE', items: PLAYBOOK_DATA.hedge, color: 'primary', icon: Shield },
          { label: 'WATCH', items: PLAYBOOK_DATA.watch, color: 'warning', icon: Eye },
        ].map(section => (
          <div key={section.label} className={`bg-card border rounded-lg p-4 ${
            section.color === 'success' ? 'border-success/20' :
            section.color === 'danger' ? 'border-danger/20' :
            section.color === 'warning' ? 'border-warning/20' :
            'border-border'
          }`}>
            <div className={`flex items-center gap-2 mb-3 font-bebas text-lg ${
              section.color === 'success' ? 'text-success' :
              section.color === 'danger' ? 'text-danger' :
              section.color === 'warning' ? 'text-warning' :
              'text-primary'
            }`}>
              <section.icon className="w-4 h-4" />
              {section.label}
            </div>
            <ul className="space-y-1.5">
              {section.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    section.color === 'success' ? 'bg-success' :
                    section.color === 'danger' ? 'bg-danger' :
                    section.color === 'warning' ? 'bg-warning' :
                    'bg-primary'
                  }`} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Decision Tree + Sensitivity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="font-bebas text-xl text-foreground mb-4">DECISION TREE — BUY/FEED/SELL</h2>
          <div className="space-y-2">
            {DECISION_TREE.map((d, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 bg-secondary/50 rounded-lg">
                <span className="text-sm text-muted-foreground">{d.condition}</span>
                <span className={`text-xs font-bebas px-2 py-0.5 rounded border ${
                  d.color === 'success' ? 'bg-success/15 text-success border-success/20' :
                  d.color === 'danger' ? 'bg-danger/15 text-danger border-danger/20' :
                  'bg-warning/15 text-warning border-warning/20'
                }`}>{d.action}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="font-bebas text-xl text-foreground mb-4">SENSITIVITY TABLE</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs text-muted-foreground pb-2">Factor Change</th>
                  <th className="text-right text-xs text-muted-foreground pb-2">ROI Impact</th>
                </tr>
              </thead>
              <tbody>
                {SENSITIVITY.map((s, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-1.5 text-foreground text-xs">{s.factor}</td>
                    <td className={`py-1.5 text-right text-xs font-medium ${
                      s.color === 'success' ? 'text-success' : s.color === 'danger' ? 'text-danger' : 'text-muted-foreground'
                    }`}>{s.roiImpact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}