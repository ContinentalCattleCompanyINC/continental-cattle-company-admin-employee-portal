import { useState } from 'react';
import SectionHeader from '@/components/SectionHeader';

export default function Trucking() {
  // Per-load inputs
  const [miles, setMiles] = useState(250);
  const [fuel, setFuel] = useState(4.10);
  const [mpg, setMpg] = useState(6.5);
  const [driverRate, setDriverRate] = useState(0.55);
  const [loadWeight, setLoadWeight] = useState(48000);
  const [shrinkPct, setShrinkPct] = useState(2.5);
  const [headCount, setHeadCount] = useState(40);
  const [ratePerMile, setRatePerMile] = useState(2.10);
  const [loadsPerWeek, setLoadsPerWeek] = useState(5);
  const [weeksPerYear, setWeeksPerYear] = useState(48);

  // Owned fleet fixed costs (monthly)
  const [truckCount, setTruckCount] = useState(2);
  const [truckPayment, setTruckPayment] = useState(3200);      // $/truck/month
  const [trailerPayment, setTrailerPayment] = useState(1100);  // $/trailer/month
  const [insurance, setInsurance] = useState(1800);            // $/truck/month
  const [registration, setRegistration] = useState(250);       // $/truck/month
  const [tires, setTires] = useState(400);                     // $/truck/month
  const [maintenance, setMaintenance] = useState(600);         // $/truck/month
  const [depreciation, setDepreciation] = useState(800);       // $/truck/month
  const [dotCompliance, setDotCompliance] = useState(150);     // $/truck/month
  const [parking, setParking] = useState(200);                 // flat/month all trucks
  const [otherFixed, setOtherFixed] = useState(300);           // flat/month all trucks

  // Per-load variable calculations
  const fuelCost = (miles / mpg) * fuel;
  const driverCost = miles * driverRate;
  const miscCost = miles * 0.15;
  const variableCostPerLoad = fuelCost + driverCost + miscCost;

  // Fixed cost calculations
  const fixedPerTruckMonth = truckPayment + trailerPayment + insurance + registration + tires + maintenance + depreciation + dotCompliance;
  const totalFixedMonthly = (fixedPerTruckMonth * truckCount) + parking + otherFixed;
  const totalFixedAnnual = totalFixedMonthly * 12;
  const loadsPerYear = loadsPerWeek * weeksPerYear * truckCount;
  const fixedCostPerLoad = loadsPerYear > 0 ? totalFixedAnnual / loadsPerYear : 0;

  // Combined
  const totalCostPerLoad = variableCostPerLoad + fixedCostPerLoad;
  const revenue = miles * ratePerMile;
  const profitPerLoad = revenue - totalCostPerLoad;
  const profitPerMile = miles > 0 ? profitPerLoad / miles : 0;
  const profitPerHead = headCount > 0 ? profitPerLoad / headCount : 0;
  const shrinkLbs = loadWeight * (shrinkPct / 100);
  const shrinkValue = shrinkLbs * 1.35;
  const costPerHead = headCount > 0 ? totalCostPerLoad / headCount : 0;
  const weeklyProfit = profitPerLoad * loadsPerWeek * truckCount;
  const annualProfit = weeklyProfit * weeksPerYear;

  const fmt = (n, d = 2) => n.toFixed(d);
  const fmtK = (n) => n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n.toFixed(0)}`;

  return (
    <div className="p-6 space-y-6">
      <SectionHeader
        title="TRUCKING MODULE"
        subtitle="Grand Slam & Full Count — Owned Fleet + Load Profitability Optimizer"
        badge="Fleet Ops"
      />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

        {/* Column 1: Per-Load Inputs */}
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
              { label: 'Loads/Week (per truck)', val: loadsPerWeek, set: setLoadsPerWeek, step: 1 },
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

        {/* Column 2: Owned Fleet Fixed Expenses */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-bebas text-xl text-foreground mb-1">OWNED FLEET EXPENSES</h3>
          <p className="text-xs text-muted-foreground mb-4">Monthly costs per truck (unless noted)</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Number of Trucks</label>
              <input type="number" step={1} value={truckCount}
                onChange={e => setTruckCount(parseFloat(e.target.value) || 1)}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-sm" />
            </div>
            {[
              { label: 'Truck Payment ($/truck/mo)', val: truckPayment, set: setTruckPayment, step: 100 },
              { label: 'Trailer Payment ($/truck/mo)', val: trailerPayment, set: setTrailerPayment, step: 100 },
              { label: 'Insurance ($/truck/mo)', val: insurance, set: setInsurance, step: 50 },
              { label: 'Registration ($/truck/mo)', val: registration, set: setRegistration, step: 25 },
              { label: 'Tires ($/truck/mo)', val: tires, set: setTires, step: 50 },
              { label: 'Maintenance ($/truck/mo)', val: maintenance, set: setMaintenance, step: 50 },
              { label: 'Depreciation ($/truck/mo)', val: depreciation, set: setDepreciation, step: 50 },
              { label: 'DOT/Compliance ($/truck/mo)', val: dotCompliance, set: setDotCompliance, step: 25 },
              { label: 'Parking/Yard ($/mo all)', val: parking, set: setParking, step: 50 },
              { label: 'Other Fixed ($/mo all)', val: otherFixed, set: setOtherFixed, step: 50 },
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

        {/* Column 3: Cost Breakdown */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="font-bebas text-xl text-foreground mb-4">VARIABLE COST / LOAD</h3>
            <div className="space-y-3">
              {[
                { label: 'Fuel Cost', value: fuelCost, color: 'warning' },
                { label: 'Driver Cost', value: driverCost, color: 'warning' },
                { label: 'Misc (tires, maint)', value: miscCost, color: 'muted' },
                { label: 'Total Variable/Load', value: variableCostPerLoad, color: 'danger', bold: true },
              ].map(r => (
                <div key={r.label} className={`flex justify-between items-center ${r.bold ? 'border-t border-border pt-2' : ''}`}>
                  <span className="text-sm text-muted-foreground">{r.label}</span>
                  <span className={`font-medium ${r.bold ? 'font-bebas text-xl' : 'text-sm'} ${
                    r.color === 'success' ? 'text-success' : r.color === 'danger' ? 'text-danger' :
                    r.color === 'warning' ? 'text-warning' : 'text-muted-foreground'
                  }`}>${fmt(r.value)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="font-bebas text-xl text-foreground mb-4">FIXED COST SUMMARY</h3>
            <div className="space-y-2">
              {[
                { label: `Fixed/Truck/Month`, value: `$${fixedPerTruckMonth.toLocaleString()}` },
                { label: `Total Fixed/Month (${truckCount} trucks)`, value: `$${totalFixedMonthly.toLocaleString()}` },
                { label: 'Total Fixed/Year', value: fmtK(totalFixedAnnual) },
                { label: `Loads/Year (${truckCount} trucks)`, value: loadsPerYear.toLocaleString() },
                { label: 'Fixed Cost/Load', value: `$${fmt(fixedCostPerLoad)}`, highlight: true },
              ].map(r => (
                <div key={r.label} className={`flex justify-between items-center p-2 rounded ${r.highlight ? 'bg-primary/10 border border-primary/20' : 'bg-secondary/40'}`}>
                  <span className="text-xs text-muted-foreground">{r.label}</span>
                  <span className={`text-sm font-medium ${r.highlight ? 'text-primary font-bebas text-lg' : 'text-foreground'}`}>{r.value}</span>
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

        {/* Column 4: Profit Summary */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="font-bebas text-xl text-foreground mb-4">TOTAL COST / LOAD</h3>
            <div className="space-y-2">
              {[
                { label: 'Variable Cost/Load', value: `$${fmt(variableCostPerLoad)}`, color: 'text-warning' },
                { label: 'Fixed Cost/Load', value: `$${fmt(fixedCostPerLoad)}`, color: 'text-warning' },
                { label: 'TOTAL COST/LOAD', value: `$${fmt(totalCostPerLoad)}`, color: 'text-danger', big: true },
                { label: 'Revenue/Load', value: `$${fmt(revenue)}`, color: 'text-success', big: true },
              ].map(r => (
                <div key={r.label} className={`flex justify-between items-center p-2.5 rounded ${r.big ? 'bg-secondary border border-border' : ''}`}>
                  <span className="text-xs text-muted-foreground">{r.label}</span>
                  <span className={`${r.big ? 'font-bebas text-2xl' : 'text-sm font-medium'} ${r.color}`}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="font-bebas text-xl text-foreground mb-4">PROFIT SUMMARY</h3>
            <div className="space-y-3">
              {[
                { label: 'Profit / Load', value: `$${fmt(profitPerLoad)}`, color: profitPerLoad > 0 ? 'text-success' : 'text-danger' },
                { label: 'Profit / Mile', value: `$${fmt(profitPerMile, 3)}`, color: profitPerMile > 0 ? 'text-success' : 'text-danger' },
                { label: 'Profit / Head', value: `$${fmt(profitPerHead)}`, color: profitPerHead > 0 ? 'text-success' : 'text-danger' },
                { label: `Weekly Profit (${truckCount} trucks)`, value: fmtK(weeklyProfit), color: weeklyProfit > 0 ? 'text-success' : 'text-danger' },
                { label: 'Annual Profit', value: fmtK(annualProfit), color: annualProfit > 0 ? 'text-success' : 'text-danger' },
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
                { label: 'Profit/Load Target', target: '$350–$650', ok: profitPerLoad >= 350 },
                { label: 'Rate/Mile Target', target: '$1.85–$2.35', ok: ratePerMile >= 1.85 },
                { label: 'Break-Even Loads/Month', target: `${Math.ceil(totalFixedMonthly / Math.max(profitPerLoad + fixedCostPerLoad, 1))} loads`, ok: loadsPerWeek * 4 * truckCount >= Math.ceil(totalFixedMonthly / Math.max(profitPerLoad + fixedCostPerLoad, 1)) },
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