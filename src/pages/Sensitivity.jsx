import { useState } from 'react';
import SectionHeader from '@/components/SectionHeader';

const SCENARIOS = [
  { label: 'COG –20%', roi: '+8–12%', profit: '+$140–$210/hd', type: 'positive' },
  { label: 'COG –10%', roi: '+4–6%', profit: '+$70–$105/hd', type: 'positive' },
  { label: 'COG Base', roi: '—', profit: '—', type: 'neutral' },
  { label: 'COG +10%', roi: '–4–6%', profit: '–$70–$105/hd', type: 'negative' },
  { label: 'COG +20%', roi: '–8–12%', profit: '–$140–$210/hd', type: 'negative' },
];

const SENSITIVITY_TABLES = [
  {
    title: 'COST OF GAIN', sections: ['COG –20%', 'COG –10%', 'Base', 'COG +10%', 'COG +20%'],
    impacts: ['+8–12%', '+4–6%', '—', '–4–6%', '–8–12%'], note: 'Calves least sensitive. Finishers most sensitive.',
  },
  {
    title: 'DEATH LOSS', sections: ['DL –1%', 'Base', 'DL +1%', 'DL +2%'],
    impacts: ['+3–5%', '—', '–3–5%', '–6–10%'], note: 'Day-olds most sensitive. Cows/bulls least sensitive.',
  },
  {
    title: 'BASIS', sections: ['Basis +$3/cwt', 'Basis +$1/cwt', 'Base', 'Basis –$1/cwt', 'Basis –$3/cwt'],
    impacts: ['+4–6%', '+1–2%', '—', '–1–2%', '–4–6%'], note: 'B×D steers benefit most. Holsteins suffer most.',
  },
  {
    title: 'GRID PREMIUM', sections: ['Grid +$10/cwt', 'Grid +$5/cwt', 'Base', 'Grid –$5/cwt', 'Grid –$10/cwt'],
    impacts: ['+6–10%', '+3–5%', '—', '–3–5%', '–6–10%'], note: 'B×D most grid-responsive. Holsteins least.',
  },
  {
    title: 'DRESSING %', sections: ['Dress +1.5%', 'Dress +1.0%', 'Base', 'Dress –1.0%', 'Dress –1.5%'],
    impacts: ['+4–7%', '+2–4%', '—', '–2–4%', '–4–7%'], note: 'Bulls benefit most. Holsteins suffer most.',
  },
  {
    title: 'CUTOUT VALUE', sections: ['Cutout +$20/cwt', 'Cutout +$10/cwt', 'Base', 'Cutout –$10/cwt', 'Cutout –$20/cwt'],
    impacts: ['+8–12%', '+4–6%', '—', '–4–6%', '–8–12%'], note: 'Finished cattle most affected. Calves unaffected.',
  },
  {
    title: '90s TRIM PRICE', sections: ['Trim +$0.50/lb', 'Trim +$0.25/lb', 'Base', 'Trim –$0.25/lb', 'Trim –$0.50/lb'],
    impacts: ['+6–10%', '+3–5%', '—', '–3–5%', '–6–10%'], note: 'Cows/bulls most affected. Steers/heifers moderately.',
  },
];

export default function Sensitivity() {
  const [base, setBase] = useState({ lc: 241.66, cog: 0.92, basis: -2.5, dlRate: 0.5, dressPct: 63, cutout: 324.5, trim90: 3.15 });
  const [headCount, setHeadCount] = useState(100);

  // Quick ROI impact calc
  const baseROI = 18;
  const scenarios = [
    { label: 'Base Case', roi: baseROI, profit: 450 },
    { label: 'Feed Cost +20%', roi: baseROI - 10, profit: 450 - 210 },
    { label: 'Basis –$3', roi: baseROI - 5, profit: 450 - 105 },
    { label: 'DL +2%', roi: baseROI - 8, profit: 450 - 168 },
    { label: 'Grid –$10', roi: baseROI - 8, profit: 450 - 168 },
    { label: 'Cutout –$20', roi: baseROI - 10, profit: 450 - 210 },
    { label: 'All Negative', roi: baseROI - 35, profit: 450 - 735 },
    { label: 'All Positive', roi: baseROI + 20, profit: 450 + 420 },
  ];

  return (
    <div className="p-6 space-y-6">
      <SectionHeader
        title="SENSITIVITY & RISK"
        subtitle="How each variable impacts ROI — Sections 41–47"
        badge="Risk Model"
      />

      {/* Scenario Scanner */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bebas text-xl text-foreground">SCENARIO SCANNER</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Head Count:</span>
            <input type="number" value={headCount} onChange={e => setHeadCount(parseInt(e.target.value) || 1)}
              className="w-24 bg-secondary border border-border rounded px-2 py-1 text-foreground text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {scenarios.map((s, i) => (
            <div key={i} className={`p-3 rounded-lg border ${
              s.roi > baseROI ? 'bg-success/10 border-success/20' :
              s.roi === baseROI ? 'bg-primary/10 border-primary/20' :
              s.profit < 0 ? 'bg-danger/10 border-danger/20' :
              'bg-warning/10 border-warning/20'
            }`}>
              <div className="text-xs text-muted-foreground mb-1">{s.label}</div>
              <div className={`font-bebas text-2xl ${
                s.roi > baseROI ? 'text-success' : s.roi === baseROI ? 'text-primary' :
                s.roi < 0 ? 'text-danger' : 'text-warning'
              }`}>{s.roi}%</div>
              <div className={`text-xs font-medium mt-0.5 ${s.profit >= 0 ? 'text-success' : 'text-danger'}`}>
                {s.profit >= 0 ? '+' : ''}${s.profit}/hd
              </div>
              <div className={`text-xs mt-0.5 ${s.profit * headCount / 1000 >= 0 ? 'text-success' : 'text-danger'}`}>
                ${((s.profit * headCount) / 1000).toFixed(0)}K total
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sensitivity Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SENSITIVITY_TABLES.map((t) => (
          <div key={t.title} className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-bebas text-lg text-foreground mb-3">{t.title}</h3>
            <table className="w-full text-sm mb-2">
              <tbody>
                {t.sections.map((s, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-1.5 text-xs text-muted-foreground">{s}</td>
                    <td className={`py-1.5 text-right text-xs font-medium ${
                      t.impacts[i].startsWith('+') ? 'text-success' :
                      t.impacts[i].startsWith('–') ? 'text-danger' : 'text-muted-foreground'
                    }`}>{t.impacts[i]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground italic">{t.note}</p>
          </div>
        ))}
      </div>

      {/* Risk Map */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="font-bebas text-xl text-foreground mb-4">ENTERPRISE RISK MAP</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { area: 'Market Risk', level: 'MEDIUM', detail: 'LC/GF volatility, basis movement', color: 'warning' },
            { area: 'Feed Cost', level: 'HIGH', detail: 'Corn/SBM exposure, no hedge', color: 'danger' },
            { area: 'Weather Risk', level: 'MEDIUM', detail: 'Seasonal patterns, heat/mud', color: 'warning' },
            { area: 'Health Risk', level: 'LOW-MED', detail: 'BRD, scours, arrival stress', color: 'warning' },
            { area: 'Trucking', level: 'LOW', detail: 'Internal fleet, controlled routes', color: 'success' },
            { area: 'Labor', level: 'LOW', detail: 'Experienced team, systems in place', color: 'success' },
            { area: 'Compliance', level: 'LOW', detail: 'DOT, animal welfare, packer regs', color: 'success' },
            { area: 'Export/Import', level: 'MEDIUM', detail: '90s trim, plate, variety meats', color: 'warning' },
          ].map(r => (
            <div key={r.area} className={`p-3 rounded-lg border ${
              r.color === 'success' ? 'bg-success/5 border-success/20' :
              r.color === 'danger' ? 'bg-danger/5 border-danger/20' :
              'bg-warning/5 border-warning/20'
            }`}>
              <div className="text-xs text-muted-foreground mb-1">{r.area}</div>
              <div className={`font-bebas text-xl ${
                r.color === 'success' ? 'text-success' : r.color === 'danger' ? 'text-danger' : 'text-warning'
              }`}>{r.level}</div>
              <div className="text-xs text-muted-foreground mt-1">{r.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}