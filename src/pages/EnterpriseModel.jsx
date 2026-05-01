import { useState, useMemo } from 'react';
import SectionHeader from '@/components/SectionHeader';

export default function EnterpriseModel() {
  const [headCount, setHeadCount] = useState(100);
  const [stage1, setStage1] = useState({ milk: 145, starter: 185, labor: 35, dl: 40, interest: 38, freight: 18 });
  const [stage2, setStage2] = useState({ cog: 460, other: 60 });
  const [stage3, setStage3] = useState({ cog: 630, yardage: 150 });
  const [stage4, setStage4] = useState({ carcassWeight: 945, cutout: 4953 });
  const [internal, setInternal] = useState({ commission: 45, freight: 55, dispatch: 35, marketing: 40, ownership: 200 });
  const [weeks, setWeeks] = useState(52);

  const s1Cost = Object.values(stage1).reduce((a, b) => a + b, 0);
  const s1Sale = 1950;
  const s1Profit = s1Sale - (s1Cost + 1461); // purchase cost ~$1461 (95lb calf)

  const s2Cost = Object.values(stage2).reduce((a, b) => a + b, 0) + s1Cost + 1461;
  const s2Sale = 2295;
  const s2Profit = s2Sale - s2Cost;

  const s3Cost = Object.values(stage3).reduce((a, b) => a + b, 0) + s2Sale;
  const s3Sale = 2925;
  const s3Profit = s3Sale - s3Cost;

  const s4LiveEq = stage4.carcassWeight * 3.47; // approx live equivalent
  const s4Profit = stage4.cutout - s3Sale;

  const internalMargin = Object.values(internal).reduce((a, b) => a + b, 0);
  const totalProfitPerHead = s1Profit + s2Profit + s3Profit + s4Profit + internalMargin;
  const totalCostPerHead = s1Cost + s2Cost + s3Cost;
  const roi = ((totalProfitPerHead / (totalCostPerHead || 1)) * 100).toFixed(1);

  const profitWeekly = (totalProfitPerHead * headCount / (weeks || 1)).toFixed(0);
  const profitMonthly = (totalProfitPerHead * headCount / 12).toFixed(0);
  const profitAnnual = (totalProfitPerHead * headCount).toFixed(0);

  const stages = [
    {
      label: 'Stage 1: Day-Old → 400 lb',
      items: [
        { k: 'milk', v: stage1.milk, label: 'Milk cost' },
        { k: 'starter', v: stage1.starter, label: 'Starter/Grower' },
        { k: 'labor', v: stage1.labor, label: 'Labor/Meds' },
        { k: 'dl', v: stage1.dl, label: 'Death Loss alloc' },
        { k: 'interest', v: stage1.interest, label: 'Interest' },
        { k: 'freight', v: stage1.freight, label: 'Freight' },
      ],
      cost: s1Cost, sale: s1Sale, profit: s1Profit, setter: setStage1, state: stage1,
    },
    {
      label: 'Stage 2: 400 → 900 lb',
      items: [
        { k: 'cog', v: stage2.cog, label: 'Cost of Gain' },
        { k: 'other', v: stage2.other, label: 'Yardage/Interest/Other' },
      ],
      cost: s2Cost, sale: s2Sale, profit: s2Profit, setter: setStage2, state: stage2,
    },
    {
      label: 'Stage 3: 900 → 1500 lb',
      items: [
        { k: 'cog', v: stage3.cog, label: 'Cost of Gain' },
        { k: 'yardage', v: stage3.yardage, label: 'Yardage/Interest' },
      ],
      cost: s3Cost, sale: s3Sale, profit: s3Profit, setter: setStage3, state: stage3,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <SectionHeader
        title="ENTERPRISE MODEL"
        subtitle="Day-Old → Rail — Full cost & profit tracking across all 5 stages — Section 36"
        badge="Complete Model"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stage Cards */}
        <div className="lg:col-span-2 space-y-4">
          {stages.map((s, si) => (
            <div key={si} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bebas text-lg text-foreground">{s.label}</h3>
                <div className="flex gap-4 text-xs">
                  <span className="text-muted-foreground">Sale: <span className="text-primary font-medium">${s.sale}</span></span>
                  <span className={`font-medium ${s.profit >= 0 ? 'text-success' : 'text-danger'}`}>
                    Net: {s.profit >= 0 ? '+' : ''}${s.profit.toFixed(0)}/hd
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {s.items.map(item => (
                  <div key={item.k}>
                    <label className="text-xs text-muted-foreground block mb-1">{item.label}</label>
                    <input type="number" value={s.state[item.k]}
                      onChange={e => s.setter(p => ({ ...p, [item.k]: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-secondary border border-border rounded px-2 py-1.5 text-foreground text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Stage 4 */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bebas text-lg text-foreground">Stage 4: 1500 lb → Rail</h3>
              <span className={`text-xs font-medium ${s4Profit >= 0 ? 'text-success' : 'text-danger'}`}>
                Net: {s4Profit >= 0 ? '+' : ''}${s4Profit.toFixed(0)}/hd
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Carcass Weight (lb)</label>
                <input type="number" value={stage4.carcassWeight}
                  onChange={e => setStage4(p => ({ ...p, carcassWeight: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-secondary border border-border rounded px-2 py-1.5 text-foreground text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Total Cutout Value ($)</label>
                <input type="number" value={stage4.cutout}
                  onChange={e => setStage4(p => ({ ...p, cutout: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-secondary border border-border rounded px-2 py-1.5 text-foreground text-sm"
                />
              </div>
            </div>
          </div>

          {/* Stage 5 — Internal */}
          <div className="bg-card border border-primary/15 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bebas text-lg text-primary">Stage 5: Internal Transfers</h3>
              <span className="text-xs font-medium text-success">+${internalMargin}/hd captured</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {[
                { k: 'commission', label: 'Commission' },
                { k: 'freight', label: 'Freight' },
                { k: 'dispatch', label: 'Dispatch' },
                { k: 'marketing', label: 'Marketing' },
                { k: 'ownership', label: 'Ownership' },
              ].map(f => (
                <div key={f.k}>
                  <label className="text-xs text-muted-foreground block mb-1">{f.label}</label>
                  <input type="number" value={internal[f.k]}
                    onChange={e => setInternal(p => ({ ...p, [f.k]: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-secondary border border-border rounded px-2 py-1.5 text-foreground text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Panel */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="font-bebas text-xl text-foreground mb-4">ENTERPRISE OUTPUTS</h3>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Head Count</div>
                <input type="number" value={headCount} onChange={e => setHeadCount(parseInt(e.target.value) || 1)}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-sm mb-3" />
              </div>
              {[
                { label: 'Profit / Head', value: `$${totalProfitPerHead.toFixed(0)}`, color: totalProfitPerHead > 0 ? 'text-success' : 'text-danger' },
                { label: 'ROI', value: `${roi}%`, color: parseFloat(roi) > 20 ? 'text-success' : parseFloat(roi) > 5 ? 'text-warning' : 'text-danger' },
                { label: 'Internal Margin / Head', value: `$${internalMargin}`, color: 'text-primary' },
                { label: 'Profit / Week', value: `$${parseInt(profitWeekly).toLocaleString()}`, color: 'text-success' },
                { label: 'Profit / Month', value: `$${parseInt(profitMonthly).toLocaleString()}`, color: 'text-success' },
                { label: 'Profit / Year', value: `$${parseInt(profitAnnual).toLocaleString()}`, color: 'text-success' },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between p-2.5 bg-secondary/50 rounded">
                  <span className="text-xs text-muted-foreground">{r.label}</span>
                  <span className={`font-bebas text-xl ${r.color}`}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-bebas text-lg text-foreground mb-3">STAGE WATERFALL</h3>
            <div className="space-y-1">
              {[
                { label: 'Stage 1 (Day-Old→400)', v: s1Profit },
                { label: 'Stage 2 (400→900)', v: s2Profit },
                { label: 'Stage 3 (900→1500)', v: s3Profit },
                { label: 'Stage 4 (Rail)', v: s4Profit },
                { label: 'Stage 5 (Internal)', v: internalMargin },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2">
                  <div className="text-xs text-muted-foreground w-40 truncate">{s.label}</div>
                  <div className={`text-xs font-medium w-16 text-right ${s.v >= 0 ? 'text-success' : 'text-danger'}`}>
                    {s.v >= 0 ? '+' : ''}${s.v.toFixed(0)}
                  </div>
                  <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${s.v >= 0 ? 'bg-success' : 'bg-danger'}`}
                      style={{ width: `${Math.min(100, Math.abs(s.v) / 5)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}