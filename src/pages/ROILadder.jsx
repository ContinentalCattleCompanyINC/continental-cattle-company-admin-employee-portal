import { useState, useMemo } from 'react';
import SectionHeader from '@/components/SectionHeader';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const CLASSES = [
  { value: 'holstein_steer', label: 'Holstein Steer', dressingPct: 0.61, gridAdj: 0 },
  { value: 'holstein_heifer', label: 'Holstein Heifer', dressingPct: 0.60, gridAdj: -2 },
  { value: 'beef_dairy_steer', label: 'Beef × Dairy Steer', dressingPct: 0.64, gridAdj: 8 },
  { value: 'beef_dairy_heifer', label: 'Beef × Dairy Heifer', dressingPct: 0.63, gridAdj: 5 },
  { value: 'feeder_cow', label: 'Feeder Cow', dressingPct: 0.57, gridAdj: -5 },
  { value: 'feeder_bull', label: 'Feeder Bull', dressingPct: 0.60, gridAdj: -3 },
  { value: 'packer_cow', label: 'Packer Cow', dressingPct: 0.56, gridAdj: -8 },
  { value: 'packer_bull', label: 'Packer Bull', dressingPct: 0.59, gridAdj: -4 },
];

function calcLadder(cls, lcFutures, basis, cog, yardage, dlRate, interestRate, startWeight) {
  const steps = [];
  const lcEffective = lcFutures + basis + cls.gridAdj;
  let weight = startWeight;
  let cumulativeCost = weight * (lcFutures * 0.75 / 100); // approximate purchase cost

  const maxWeight = ['feeder_cow', 'packer_cow'].includes(cls.value) ? 1800 :
    ['feeder_bull', 'packer_bull'].includes(cls.value) ? 2200 : 1600;

  while (weight < maxWeight) {
    const endWeight = Math.min(weight + 150, maxWeight);
    const gainLbs = endWeight - weight;
    const days = Math.round(gainLbs / 3.2);
    const startValue = (weight * cls.dressingPct * lcEffective) / 100;
    const endValue = (endWeight * cls.dressingPct * lcEffective) / 100;
    const gainValue = endValue - startValue;
    const feedCost = gainLbs * cog;
    const yardageCost = days * yardage;
    const interestCost = cumulativeCost * (interestRate / 365) * days;
    const dlCost = cumulativeCost * dlRate;
    const totalCost = feedCost + yardageCost + interestCost + dlCost;
    const profit = gainValue - totalCost;
    const roi = cumulativeCost > 0 ? (profit / totalCost) * 100 : 0;
    const profitPerDay = days > 0 ? profit / days : 0;

    steps.push({
      startWeight: weight, endWeight, gainLbs, days,
      startValue: startValue.toFixed(0), endValue: endValue.toFixed(0),
      gainValue: gainValue.toFixed(0), totalCost: totalCost.toFixed(0),
      profit: profit.toFixed(0), roi: roi.toFixed(1),
      profitPerDay: profitPerDay.toFixed(2),
    });

    cumulativeCost += totalCost;
    weight = endWeight;
  }
  return steps;
}

export default function ROILadder() {
  const [selectedClass, setSelectedClass] = useState('beef_dairy_steer');
  const [lcFutures, setLcFutures] = useState(241.66);
  const [basis, setBasis] = useState(-2.5);
  const [cog, setCog] = useState(0.92);
  const [yardage, setYardage] = useState(0.45);
  const [dlRate, setDlRate] = useState(0.005);
  const [interestRate, setInterestRate] = useState(0.10);
  const [startWeight, setStartWeight] = useState(95);

  const cls = CLASSES.find(c => c.value === selectedClass);

  const ladder = useMemo(() =>
    calcLadder(cls, lcFutures, basis, cog, yardage, dlRate, interestRate, startWeight),
    [cls, lcFutures, basis, cog, yardage, dlRate, interestRate, startWeight]
  );

  const bestStep = ladder.reduce((best, s) => parseFloat(s.roi) > parseFloat(best.roi) ? s : best, ladder[0] || {});

  return (
    <div className="p-6 space-y-6">
      <SectionHeader
        title="ROI LADDER"
        subtitle="150-lb increment valuation for all cattle classes — Section 33"
        badge="All Classes"
      />

      {/* Controls */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="font-bebas text-xl text-foreground mb-4">INPUTS</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="lg:col-span-2">
            <label className="text-xs text-muted-foreground block mb-1">Cattle Class</label>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-sm"
            >
              {CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          {[
            { label: 'LC Futures', val: lcFutures, set: setLcFutures, step: 0.25 },
            { label: 'Basis $/cwt', val: basis, set: setBasis, step: 0.25 },
            { label: 'COG $/lb', val: cog, set: setCog, step: 0.01 },
            { label: 'Yardage/day', val: yardage, set: setYardage, step: 0.05 },
            { label: 'DL Rate', val: dlRate, set: setDlRate, step: 0.001 },
            { label: 'Interest APR', val: interestRate, set: setInterestRate, step: 0.01 },
            { label: 'Start Weight', val: startWeight, set: setStartWeight, step: 50 },
          ].map(f => (
            <div key={f.label}>
              <label className="text-xs text-muted-foreground block mb-1">{f.label}</label>
              <input type="number" step={f.step} value={f.val}
                onChange={e => f.set(parseFloat(e.target.value) || 0)}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-sm focus:border-primary/50 focus:outline-none"
              />
            </div>
          ))}
        </div>

        <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
          <span>Dressing: <span className="text-primary">{(cls.dressingPct * 100).toFixed(0)}%</span></span>
          <span>Grid Adj: <span className={cls.gridAdj >= 0 ? 'text-success' : 'text-danger'}>{cls.gridAdj >= 0 ? '+' : ''}{cls.gridAdj}</span></span>
          <span>Effective LC: <span className="text-primary">${(lcFutures + basis + cls.gridAdj).toFixed(2)}/cwt</span></span>
          {bestStep && <span>Best ROI Step: <span className="text-success">{bestStep.startWeight}→{bestStep.endWeight} lb ({bestStep.roi}%)</span></span>}
        </div>
      </div>

      {/* Ladder Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/80 border-b border-border">
                {['Step', 'Start $', 'End $', 'Gain Value', 'Total Cost', 'Profit', 'ROI %', 'Profit/Day', 'Signal'].map(h => (
                  <th key={h} className="text-left text-xs text-muted-foreground font-medium px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ladder.map((row, i) => {
                const roi = parseFloat(row.roi);
                const profit = parseFloat(row.profit);
                const isBest = row.startWeight === bestStep?.startWeight;
                return (
                  <tr key={i} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${isBest ? 'bg-success/5' : ''}`}>
                    <td className="px-4 py-2.5 font-medium text-foreground whitespace-nowrap">
                      {row.startWeight}→{row.endWeight} lb
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">${row.startValue}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">${row.endValue}</td>
                    <td className="px-4 py-2.5 text-foreground">${row.gainValue}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">${row.totalCost}</td>
                    <td className={`px-4 py-2.5 font-medium ${profit >= 0 ? 'text-success' : 'text-danger'}`}>
                      {profit >= 0 ? '+' : ''}${row.profit}
                    </td>
                    <td className={`px-4 py-2.5 font-bebas text-lg ${roi > 10 ? 'text-success' : roi > 3 ? 'text-warning' : 'text-danger'}`}>
                      {row.roi}%
                    </td>
                    <td className={`px-4 py-2.5 ${parseFloat(row.profitPerDay) >= 0 ? 'text-success' : 'text-danger'}`}>
                      ${row.profitPerDay}
                    </td>
                    <td className="px-4 py-2.5">
                      {roi > 10 ? (
                        <span className="text-xs bg-success/15 text-success border border-success/20 px-2 py-0.5 rounded">FEED</span>
                      ) : roi > 3 ? (
                        <span className="text-xs bg-warning/15 text-warning border border-warning/20 px-2 py-0.5 rounded">HOLD</span>
                      ) : (
                        <span className="text-xs bg-danger/15 text-danger border border-danger/20 px-2 py-0.5 rounded">SELL</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}