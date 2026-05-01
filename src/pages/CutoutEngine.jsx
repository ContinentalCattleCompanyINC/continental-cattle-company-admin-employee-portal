import { useState, useMemo } from 'react';
import SectionHeader from '@/components/SectionHeader';

const PRIMALS = [
  { name: 'Chuck', pct: 0.29, subprimals: 'Chuck roll, clod, tender', priceRange: [3.50, 4.50] },
  { name: 'Rib', pct: 0.09, subprimals: 'Ribeye roll, back ribs', priceRange: [8.50, 10.50] },
  { name: 'Loin', pct: 0.16, subprimals: 'Strip, tender, sirloin', priceRange: [7.50, 14.00] },
  { name: 'Round', pct: 0.22, subprimals: 'Knuckle, inside, outside', priceRange: [3.00, 4.00] },
  { name: 'Brisket', pct: 0.06, subprimals: 'Brisket', priceRange: [3.50, 3.50] },
  { name: 'Plate', pct: 0.08, subprimals: 'Short ribs, skirts', priceRange: [4.00, 6.00] },
  { name: 'Flank', pct: 0.04, subprimals: 'Flank steak', priceRange: [6.00, 6.00] },
  { name: 'Trim', pct: 0.06, subprimals: '90s/50s', priceRange: [2.70, 2.70] },
  { name: 'Variety', pct: 0, lbsFixed: 25, subprimals: 'Tongue, cheek, heart', priceRange: [2.00, 4.00] },
];

// Import/Export adjustments
const adjustments = {
  high_import: { trim: -0.30, plate: -0.50, variety: -0.50 },
  low_import: { trim: 0.30, plate: 0.25, variety: 0.25 },
  normal_import: { trim: 0, plate: 0, variety: 0 },
  high_export: { plate: 1.00, variety: 0.75, rib: 0.50 },
  low_export: { plate: -0.75, variety: -0.50, rib: -0.25 },
  normal_export: {},
};

export default function CutoutEngine() {
  const [liveWeight, setLiveWeight] = useState(1500);
  const [dressingPct, setDressingPct] = useState(0.63);
  const [importVol, setImportVol] = useState('normal');
  const [exportVol, setExportVol] = useState('normal');
  const [pricePoints, setPricePoints] = useState(
    Object.fromEntries(PRIMALS.map(p => [p.name, (p.priceRange[0] + p.priceRange[1]) / 2]))
  );

  const carcassWeight = Math.round(liveWeight * dressingPct);
  const importAdj = adjustments[`${importVol}_import`] || {};
  const exportAdj = adjustments[`${exportVol}_export`] || {};

  const rows = useMemo(() => PRIMALS.map(p => {
    const weight = p.lbsFixed || Math.round(carcassWeight * p.pct);
    const basePrice = pricePoints[p.name] || p.priceRange[0];
    const iadj = importAdj[p.name.toLowerCase()] || 0;
    const eadj = exportAdj[p.name.toLowerCase()] || 0;
    const adjPrice = basePrice + iadj + eadj;
    const revenue = weight * adjPrice;
    return { ...p, weight, adjPrice: adjPrice.toFixed(2), revenue: revenue.toFixed(0), iadj, eadj };
  }), [carcassWeight, pricePoints, importAdj, exportAdj]);

  const totalRevenue = rows.reduce((s, r) => s + parseFloat(r.revenue), 0);
  const cutoutPerCwt = (totalRevenue / carcassWeight * 100).toFixed(2);
  const liveEquivalent = (totalRevenue * 0.662).toFixed(0); // approx conversion
  const packerMargin = (totalRevenue - parseFloat(liveEquivalent)).toFixed(0);

  return (
    <div className="p-6 space-y-6">
      <SectionHeader
        title="CUTOUT ENGINE"
        subtitle="Carcass → Primals → Subprimals → Revenue — Section 34"
        badge="Full Cutout"
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-bebas text-lg text-foreground mb-3">INPUTS</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Live Weight (lb)</label>
                <input type="number" value={liveWeight} onChange={e => setLiveWeight(parseFloat(e.target.value))}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Dressing %</label>
                <input type="number" step="0.01" value={dressingPct} onChange={e => setDressingPct(parseFloat(e.target.value))}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Import Volume</label>
                <select value={importVol} onChange={e => setImportVol(e.target.value)}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-sm">
                  <option value="high">High (–trim)</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low (+trim)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Export Volume</label>
                <select value={exportVol} onChange={e => setExportVol(e.target.value)}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-sm">
                  <option value="high">High (+plate/ribs)</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low (–plate/ribs)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <h3 className="font-bebas text-lg text-foreground">SUMMARY</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Carcass Weight</span>
                <span className="text-sm font-medium text-foreground">{carcassWeight} lb</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Total Cutout Value</span>
                <span className="text-lg font-bebas text-success">${parseInt(totalRevenue).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Cutout per cwt</span>
                <span className="text-sm font-medium text-primary">${cutoutPerCwt}/cwt</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Live Equivalent</span>
                <span className="text-sm font-medium text-foreground">${parseInt(liveEquivalent).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <span className="text-xs text-muted-foreground">Est. Packer Margin</span>
                <span className={`text-sm font-bebas ${parseFloat(packerMargin) > 0 ? 'text-warning' : 'text-success'}`}>
                  ${parseInt(packerMargin).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Primal Table */}
        <div className="lg:col-span-3 bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-bebas text-xl text-foreground">PRIMAL BREAKDOWN — {carcassWeight} lb Carcass</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/80 border-b border-border">
                  {['Primal', '% of Carcass', 'Weight (lb)', 'Subprimals', 'Base Price', 'Adj Price', 'Revenue'].map(h => (
                    <th key={h} className="text-left text-xs text-muted-foreground font-medium px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{row.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.pct ? `${(row.pct * 100).toFixed(0)}%` : '—'}</td>
                    <td className="px-4 py-3 text-foreground">{row.weight} lb</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{row.subprimals}</td>
                    <td className="px-4 py-3">
                      <input type="number" step="0.05" value={pricePoints[row.name]}
                        onChange={e => setPricePoints(p => ({ ...p, [row.name]: parseFloat(e.target.value) || 0 }))}
                        className="w-20 bg-secondary border border-border rounded px-2 py-1 text-foreground text-xs"
                      />
                    </td>
                    <td className={`px-4 py-3 font-medium ${row.iadj + row.eadj > 0 ? 'text-success' : row.iadj + row.eadj < 0 ? 'text-danger' : 'text-foreground'}`}>
                      ${row.adjPrice}
                      {(row.iadj + row.eadj) !== 0 && (
                        <span className="text-xs ml-1">({row.iadj + row.eadj > 0 ? '+' : ''}{(row.iadj + row.eadj).toFixed(2)})</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-bebas text-lg text-success">${parseInt(row.revenue).toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="bg-secondary/50 border-t border-primary/20">
                  <td colSpan={6} className="px-4 py-3 font-bebas text-lg text-foreground">TOTAL CUTOUT VALUE</td>
                  <td className="px-4 py-3 font-bebas text-xl text-success">${parseInt(totalRevenue).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}