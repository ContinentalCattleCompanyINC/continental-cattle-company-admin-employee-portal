import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import SectionHeader from '@/components/SectionHeader';
import StatCard from '@/components/StatCard';
import {
  TrendingUp, TrendingDown, Activity, AlertTriangle,
  DollarSign, BarChart3, Beef, Truck, ArrowRight, Target, Calculator
} from 'lucide-react';
import { format } from 'date-fns';

// 2026 baseline market data
const DEFAULTS = {
  lc: 241.66, gf: 285.40, corn: 4.22, sbm: 340,
  choice: 324.50, trim90: 3.15, basis: -2.50
};

export default function Dashboard() {
  const { data: marketInputs } = useQuery({
    queryKey: ['marketInputs'],
    queryFn: () => base44.entities.MarketInputs.list('-date', 1),
    initialData: [],
  });

  const { data: lots } = useQuery({
    queryKey: ['cattleLots'],
    queryFn: () => base44.entities.CattleLot.filter({ status: 'active' }),
    initialData: [],
  });

  const latest = marketInputs?.[0] || {};
  const lc = latest.lc_futures || DEFAULTS.lc;
  const gf = latest.gf_futures || DEFAULTS.gf;
  const choice = latest.choice_cutout || DEFAULTS.choice;
  const trim90 = latest.trim_90s || DEFAULTS.trim90;

  const totalHead = lots.reduce((s, l) => s + (l.head_count || 0), 0);
  const totalValue = lots.reduce((s, l) => s + ((l.current_weight || l.purchase_weight) * (l.purchase_price / 100) * l.head_count), 0);

  // Cutout-to-live spread (proxy)
  const cutoutLiveSpread = choice - lc;

  const roiSignal = lc > 235 ? 'strong' : lc > 220 ? 'moderate' : 'weak';

  const marketAlerts = [];
  if (lc > 240) marketAlerts.push({ type: 'success', msg: `LC at $${lc} — premium sell window` });
  if (gf > 280) marketAlerts.push({ type: 'warning', msg: `Feeders at $${gf} — buy calves carefully` });
  if (trim90 > 3.20) marketAlerts.push({ type: 'success', msg: `90s trim strong at $${trim90} — sell cows/bulls` });
  if (cutoutLiveSpread > 80) marketAlerts.push({ type: 'success', msg: `Cutout spread wide — packers bidding up` });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-bebas text-4xl text-foreground tracking-wide">COMMAND CENTER</h1>
          <p className="text-muted-foreground text-sm mt-1">Continental Cattle Co INC — Master Economics Platform</p>
          <div className="h-px bg-gradient-to-r from-primary/40 to-transparent mt-3 w-96" />
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Today</div>
          <div className="text-primary font-bebas text-xl">{format(new Date(), 'MMM d, yyyy')}</div>
          <div className={`text-xs mt-1 font-medium ${
            roiSignal === 'strong' ? 'text-success' : roiSignal === 'moderate' ? 'text-warning' : 'text-danger'
          }`}>
            Market: {roiSignal.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Market Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'LC Futures', value: `$${lc}`, unit: '/cwt', color: 'primary' },
          { label: 'GF Futures', value: `$${gf}`, unit: '/cwt', color: 'primary' },
          { label: 'Choice Cutout', value: `$${choice}`, unit: '/cwt', color: 'success' },
          { label: '90s Trim', value: `$${trim90}`, unit: '/lb', color: 'success' },
          { label: 'Corn', value: `$${latest.corn_price || DEFAULTS.corn}`, unit: '/bu', color: 'warning' },
          { label: 'SBM', value: `$${latest.sbm_price || DEFAULTS.sbm}`, unit: '/ton', color: 'warning' },
          { label: 'Basis', value: `${latest.basis_southern_plains || DEFAULTS.basis}`, unit: '/cwt', color: 'primary' },
        ].map((m) => (
          <div key={m.label} className={`bg-card border border-border rounded-lg p-3 text-center`}>
            <div className="text-xs text-muted-foreground mb-1">{m.label}</div>
            <div className={`font-bebas text-xl ${
              m.color === 'success' ? 'text-success' : m.color === 'warning' ? 'text-warning' : 'text-primary'
            }`}>{m.value}</div>
            <div className="text-xs text-muted-foreground">{m.unit}</div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {marketAlerts.length > 0 && (
        <div className="space-y-2">
          {marketAlerts.map((a, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border text-sm ${
              a.type === 'success' ? 'bg-success/10 border-success/20 text-success' :
              a.type === 'warning' ? 'bg-warning/10 border-warning/20 text-warning' :
              'bg-danger/10 border-danger/20 text-danger'
            }`}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {a.msg}
            </div>
          ))}
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Head" value={totalHead.toLocaleString()} sub="Across all lots" color="primary" icon={Beef} />
        <StatCard title="Portfolio Value" value={`$${(totalValue/1000).toFixed(0)}K`} sub="Est. live value" color="success" icon={DollarSign} />
        <StatCard title="Cutout Spread" value={`$${cutoutLiveSpread.toFixed(2)}`} sub="Cutout vs LC" color={cutoutLiveSpread > 80 ? 'success' : 'warning'} icon={BarChart3} />
        <StatCard title="Trim Signal" value={trim90 > 3.00 ? 'STRONG' : 'WEAK'} sub={`$${trim90}/lb 90s`} color={trim90 > 3.00 ? 'success' : 'danger'} icon={TrendingUp} />
      </div>

      {/* ROI Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bebas text-xl text-foreground">ROI CLASS RANKINGS</h2>
            <span className="text-xs text-primary">2026 Market</span>
          </div>
          <div className="space-y-2">
            {[
              { rank: 1, class: 'Day-Old Calves', roi: '55–110%', why: 'Multi-layer internal margins', color: 'text-success' },
              { rank: 2, class: 'Cull Cows', roi: '20–30%', why: 'Heavy carcass, tight supply', color: 'text-success' },
              { rank: 3, class: 'Light Calves (350–550)', roi: '18–25%', why: 'Cheapest gain, flexible exit', color: 'text-success' },
              { rank: 4, class: 'Bulls', roi: '15–20%', why: 'High yield, strong kill demand', color: 'text-warning' },
              { rank: 5, class: 'Light Calf Quick Flip', roi: '2–5%', why: 'Only at scale', color: 'text-warning' },
              { rank: 6, class: 'Finishers (no grid)', roi: 'Negative', why: 'Premium grid required', color: 'text-danger' },
            ].map((r) => (
              <div key={r.rank} className="flex items-center gap-3 p-2.5 rounded-md bg-secondary/50 hover:bg-secondary transition-colors">
                <span className="text-muted-foreground font-bebas text-lg w-6">{r.rank}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">{r.class}</div>
                  <div className="text-xs text-muted-foreground">{r.why}</div>
                </div>
                <span className={`text-sm font-bebas ${r.color}`}>{r.roi}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Signals */}
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bebas text-xl text-foreground">THIS WEEK'S SIGNALS</h2>
            <Link to="/playbook" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
              Full Playbook <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {[
              { label: 'BUY', items: ['350–550 lb calves', '1100–1500 lb cows', '1400–1800 lb bulls'], color: 'success' },
              { label: 'SELL', items: ['2000–2250 lb bulls', '1650–1850 lb cows', '1450–1600 lb B×D steers'], color: 'primary' },
              { label: 'AVOID', items: ['Holsteins past 1450 lb', '550–700 lb Holsteins'], color: 'danger' },
              { label: 'WATCH', items: ['90s trim imports', 'Short plate exports', 'Box beef movement'], color: 'warning' },
            ].map((s) => (
              <div key={s.label}>
                <div className={`text-xs font-bebas tracking-wider mb-1 ${
                  s.color === 'success' ? 'text-success' : s.color === 'danger' ? 'text-danger' :
                  s.color === 'warning' ? 'text-warning' : 'text-primary'
                }`}>{s.label}</div>
                <div className="flex flex-wrap gap-1.5">
                  {s.items.map((item) => (
                    <span key={item} className={`text-xs px-2 py-0.5 rounded border ${
                      s.color === 'success' ? 'bg-success/10 border-success/20 text-success' :
                      s.color === 'danger' ? 'bg-danger/10 border-danger/20 text-danger' :
                      s.color === 'warning' ? 'bg-warning/10 border-warning/20 text-warning' :
                      'bg-primary/10 border-primary/20 text-primary'
                    }`}>{item}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Nav */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Enter Market Data', path: '/market', icon: Activity },
          { label: 'Run ROI Ladder', path: '/roi-ladder', icon: Calculator },
          { label: 'Cutout Engine', path: '/cutout', icon: BarChart3 },
          { label: 'Enterprise Model', path: '/enterprise', icon: Target },
          { label: 'Master Document', path: '/document', icon: TrendingUp },
        ].map((q) => (
          <Link
            key={q.path}
            to={q.path}
            className="bg-card border border-border hover:border-primary/30 hover:bg-primary/5 rounded-lg p-4 flex flex-col items-center gap-2 transition-all group"
          >
            <q.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-xs text-center text-muted-foreground group-hover:text-foreground transition-colors">{q.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}