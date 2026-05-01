import { useState } from 'react';
import SectionHeader from '@/components/SectionHeader';

export default function Trucking() {
  const [miles, setMiles] = useState(250);
  const [fuel, setFuel] = useState(4.10);
  const [mpg, setMpg] = useState(6.5);
  const [driverRate, setDriverRate] = useState(0.55);
  const [loadWeight, setLoadWeight] = useState(48000);
  const [shrinkPct, setShrinkPct] = useState(2.5);
  const [headCount, setHeadCount] = useState(40);
  const [ratePerMile, setRatePerMile] = useState(2.10);
  const [weeksPerYear, setWeeksPerYear] = useState(48);
  const [loadsPerWeek, setLoadsPerWeek] = useState(5);

  const fuelCost = (miles / mpg) * fuel;
  const driverCost = miles * driverRate;
  const miscCost = miles * 0.15;
  const totalCost = fuelCost + driverCost + miscCost;
  const revenue = miles * ratePerMile;
  const profitPerLoad = revenue - totalCost;
  const profitPerMile = profitPerLoad / miles;
  const profitPerHead = headCount > 0 ? profitPerLoad / headCount : 0;
  const costPerHead = headCount > 0 ? totalCost / headCount : 0;
  const shrinkLbs = loadWeight * (shrinkPct / 100);
  const shrinkValue = shrinkLbs * 1.35; // approx $/lb
  const weeklyProfit = profitPerLoad * loadsPerWeek;
  const annualProfit = weeklyProfit * weeksPerYear;

  return (
    <div className="p-6 space-y-6">
      <SectionHeader
        title="TRUCKING MODULE"
        subtitle="Grand Slam & Full Count — Load profitability optimizer — Sections 51, 68"
        badge="Fleet Ops"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inputs */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-bebas text-xl text-foreground mb-4">LOAD INPUTS</h3>
          <div className="space-y-3">
            {[
              { label: 'Miles per Load', val: miles, set: setMiles, step: 10 },
              { label: 'Diesel ($/gal)', val: fuel, set: setFuel, step: 0.05 },
              { label: 'Fuel Economy (MPG)', val: mpg, set: setMpg, step: 0.5 },
              { label: 'Driver Rate ($/mile)', val: driverRate, set: setDriverRate, step: 0.05 },
              { label: 'Load Weight (lb)', val: loadWeight, set: setLoadWeight, step: 1000 },
              { label: 'Shrink (%)', val: shrinkPct, set: setShrinkPct, step: 0.5 },
              { label: 'Head Count', val: headCount, set: setHeadCount, step: 5 },
              { label: 'Rate ($/mile)', val: ratePerMile, set: setRatePerMile, step: 0.05 },
              { label: 'Loads/Week', val: loadsPerWeek, set: setLoadsPerWeek, step: 1 },
              { label: 'Weeks/Year', val: weeksPerYear, set: setWeeksPerYear, step: 1 },
            ].map(f => (
              <div key={f.label}>
                <label className="text-xs text-muted-foreground block mb-1">{f.label}</label>
                <input type="number" step={f.step} value={f.val}
                  onChange={e => f.set(parseFloat(e.target.value) || 0)}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-sm" />
              </div>
            ))}
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="font-bebas text-xl text-foreground mb-4">COST BREAKDOWN</h3>
            <div className="space-y-3">
              {[
                { label: 'Fuel Cost', value: fuelCost, color: 'warning' },
                { label: 'Driver Cost', value: driverCost, color: 'warning' },
                { label: 'Misc (tires, maint)', value: miscCost, color: 'muted' },
                { label: 'Total Cost/Load', value: totalCost, color: 'danger', bold: true },
                { label: 'Revenue/Load', value: revenue, color: 'success', bold: true },
              ].map(r => (
                <div key={r.label} className={`flex justify-between items-center ${r.bold ? 'border-t border-border pt-2' : ''}`}>
                  <span className="text-sm text-muted-foreground">{r.label}</span>
                  <span className={`font-medium ${r.bold ? 'font-bebas text-xl' : 'text-sm'} ${
                    r.color === 'success' ? 'text-success' : r.color === 'danger' ? 'text-danger' :
                    r.color === 'warning' ? 'text-warning' : 'text-muted-foreground'
                  }`}>${r.value.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="font-bebas text-xl text-foreground mb-3">SHRINK IMPACT</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Shrink lbs</span>
                <span className="text-sm text-danger">{shrinkLbs.toFixed(0)} lb</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Shrink value lost</span>
                <span className="text-sm text-danger">–${shrinkValue.toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Cost / head</span>
                <span className="text-sm text-warning">${costPerHead.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Profit Summary */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="font-bebas text-xl text-foreground mb-4">PROFIT SUMMARY</h3>
            <div className="space-y-3">
              {[
                { label: 'Profit / Load', value: `$${profitPerLoad.toFixed(2)}`, color: profitPerLoad > 0 ? 'text-success' : 'text-danger' },
                { label: 'Profit / Mile', value: `$${profitPerMile.toFixed(3)}`, color: profitPerMile > 0 ? 'text-success' : 'text-danger' },
                { label: 'Profit / Head', value: `$${profitPerHead.toFixed(2)}`, color: profitPerHead > 0 ? 'text-success' : 'text-danger' },
                { label: 'Weekly Profit', value: `$${weeklyProfit.toFixed(0)}`, color: weeklyProfit > 0 ? 'text-success' : 'text-danger' },
                { label: 'Annual Profit', value: `$${annualProfit.toLocaleString(undefined, {maximumFractionDigits: 0})}`, color: annualProfit > 0 ? 'text-success' : 'text-danger' },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between p-2.5 bg-secondary/50 rounded">
                  <span className="text-xs text-muted-foreground">{r.label}</span>
                  <span className={`font-bebas text-xl ${r.color}`}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="font-bebas text-lg text-foreground mb-3">TARGETS</h3>
            <div className="space-y-2 text-sm">
              {[
                { label: 'Profit/Load Target', target: '$350–$650', actual: profitPerLoad, ok: profitPerLoad >= 350 },
                { label: 'Rate/Mile Target', target: '$1.85–$2.35', actual: ratePerMile, ok: ratePerMile >= 1.85 },
              ].map(t => (
                <div key={t.label} className="flex items-center justify-between p-2 rounded border border-border">
                  <div>
                    <div className="text-xs font-medium text-foreground">{t.label}</div>
                    <div className="text-xs text-muted-foreground">Target: {t.target}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${t.ok ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>
                    {t.ok ? 'ON TARGET' : 'BELOW'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}