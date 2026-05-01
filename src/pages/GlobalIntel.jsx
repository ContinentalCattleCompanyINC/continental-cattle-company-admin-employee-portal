import { useState } from 'react';
import SectionHeader from '@/components/SectionHeader';

const GLOBAL_DATA = {
  imports: [
    { country: 'Australia', product: 'Lean trim (90s/50s)', impact: 'Reduces domestic trim prices', priceEffect: '–$0.20 to –$0.40/lb', volume: 'HIGH' },
    { country: 'Brazil', product: 'Lean trim, boneless cow', impact: 'Competes on 90s market', priceEffect: '–$0.10 to –$0.30/lb', volume: 'NORMAL' },
    { country: 'Uruguay', product: 'Lean trim (90s)', impact: 'Seasonal pressure on trim', priceEffect: '–$0.05 to –$0.20/lb', volume: 'LOW' },
    { country: 'New Zealand', product: 'Variety meats, lean beef', impact: 'Minor domestic impact', priceEffect: 'Minimal', volume: 'LOW' },
  ],
  exports: [
    { country: 'Japan', product: 'Short ribs, tongue, variety', impact: 'Lifts primal values', priceEffect: '+$0.75/lb (tongue)', volume: 'NORMAL' },
    { country: 'South Korea', product: 'Short plate, short ribs', impact: 'Major plate/rib driver', priceEffect: '+$0.50–$1.50/lb', volume: 'HIGH' },
    { country: 'China', product: 'Offal, variety, boneless', impact: 'Variety meat demand driver', priceEffect: '+$0.25–$0.75/lb', volume: 'NORMAL' },
    { country: 'Mexico', product: 'Trimmings, ground beef', impact: 'Ground beef outlet', priceEffect: '+$0.10–$0.25/lb', volume: 'HIGH' },
    { country: 'Canada', product: 'Full muscle beef', impact: 'Premium cut outlet', priceEffect: '+$0.15–$0.30/lb', volume: 'NORMAL' },
  ],
};

const MARKET_SIGNALS = [
  { name: 'LC Trend', value: 'Bullish', detail: '70-yr low herd supports prices', color: 'success' },
  { name: 'GF Trend', value: 'Very Strong', detail: 'Feeder supply extremely tight', color: 'success' },
  { name: 'Corn Trend', value: 'Neutral', detail: 'Normal crop year expected', color: 'warning' },
  { name: 'SBM Trend', value: 'Elevated', detail: 'South American crush reduced', color: 'warning' },
  { name: 'Box Beef', value: 'Firm', detail: 'Domestic demand solid', color: 'success' },
  { name: '90s Trim', value: 'Strong', detail: 'Low import competition', color: 'success' },
  { name: 'Export Demand', value: 'Mixed', detail: 'Korea strong, China cautious', color: 'warning' },
  { name: 'Import Pressure', value: 'Increasing', detail: 'AU/BR volumes up 6%', color: 'danger' },
];

export default function GlobalIntel() {
  const [importVol, setImportVol] = useState({ Australia: 'HIGH', Brazil: 'NORMAL', Uruguay: 'LOW', 'New Zealand': 'LOW' });
  const [exportVol, setExportVol] = useState({ Japan: 'NORMAL', 'South Korea': 'HIGH', China: 'NORMAL', Mexico: 'HIGH', Canada: 'NORMAL' });

  // Compute adjusted trim price
  const highImports = Object.values(importVol).filter(v => v === 'HIGH').length;
  const lowImports = Object.values(importVol).filter(v => v === 'LOW').length;
  const trimAdj = ((lowImports - highImports) * 0.20).toFixed(2);

  const highExports = Object.values(exportVol).filter(v => v === 'HIGH').length;
  const plateAdj = (highExports * 0.35).toFixed(2);

  return (
    <div className="p-6 space-y-6">
      <SectionHeader
        title="GLOBAL INTEL"
        subtitle="Import/Export adjustment engine — Sections 35, 119–120, 226–250"
        badge="Global Engine"
      />

      {/* Market Signals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {MARKET_SIGNALS.map(s => (
          <div key={s.name} className={`p-3 rounded-lg border ${
            s.color === 'success' ? 'bg-success/10 border-success/20' :
            s.color === 'danger' ? 'bg-danger/10 border-danger/20' :
            'bg-warning/10 border-warning/20'
          }`}>
            <div className="text-xs text-muted-foreground">{s.name}</div>
            <div className={`font-bebas text-lg ${
              s.color === 'success' ? 'text-success' : s.color === 'danger' ? 'text-danger' : 'text-warning'
            }`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.detail}</div>
          </div>
        ))}
      </div>

      {/* Price Adjustments */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-4 rounded-lg border ${parseFloat(trimAdj) >= 0 ? 'bg-success/10 border-success/20' : 'bg-danger/10 border-danger/20'}`}>
          <div className="text-xs text-muted-foreground">90s Trim Adjustment</div>
          <div className={`font-bebas text-3xl ${parseFloat(trimAdj) >= 0 ? 'text-success' : 'text-danger'}`}>
            {parseFloat(trimAdj) >= 0 ? '+' : ''}${trimAdj}/lb
          </div>
          <div className="text-xs text-muted-foreground mt-1">Based on current import volumes</div>
        </div>
        <div className={`p-4 rounded-lg border ${parseFloat(plateAdj) >= 0 ? 'bg-success/10 border-success/20' : 'bg-warning/10 border-warning/20'}`}>
          <div className="text-xs text-muted-foreground">Short Plate/Rib Adjustment</div>
          <div className={`font-bebas text-3xl ${parseFloat(plateAdj) >= 0 ? 'text-success' : 'text-warning'}`}>
            +${plateAdj}/lb
          </div>
          <div className="text-xs text-muted-foreground mt-1">Based on current export demand</div>
        </div>
        <div className="p-4 rounded-lg border bg-primary/10 border-primary/20">
          <div className="text-xs text-muted-foreground">Net Carcass Value Impact</div>
          <div className="font-bebas text-3xl text-primary">
            +${(parseFloat(trimAdj) * 35 + parseFloat(plateAdj) * 50).toFixed(0)}/head
          </div>
          <div className="text-xs text-muted-foreground mt-1">Estimated per 945 lb carcass</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Imports */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-bebas text-xl text-foreground">IMPORT SOURCES</h2>
            <p className="text-xs text-muted-foreground">Adjust volumes to see price impact</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/80 border-b border-border">
                  {['Country', 'Product', 'Price Effect', 'Volume'].map(h => (
                    <th key={h} className="text-left text-xs text-muted-foreground px-4 py-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GLOBAL_DATA.imports.map((r, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="px-4 py-2.5 font-medium text-foreground">{r.country}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.product}</td>
                    <td className="px-4 py-2.5 text-danger text-xs">{r.priceEffect}</td>
                    <td className="px-4 py-2.5">
                      <select value={importVol[r.country] || r.volume}
                        onChange={e => setImportVol(p => ({ ...p, [r.country]: e.target.value }))}
                        className="bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground">
                        <option value="HIGH">HIGH</option>
                        <option value="NORMAL">NORMAL</option>
                        <option value="LOW">LOW</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Exports */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-bebas text-xl text-foreground">EXPORT DESTINATIONS</h2>
            <p className="text-xs text-muted-foreground">Adjust volumes to see price impact</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/80 border-b border-border">
                  {['Country', 'Product', 'Price Effect', 'Volume'].map(h => (
                    <th key={h} className="text-left text-xs text-muted-foreground px-4 py-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GLOBAL_DATA.exports.map((r, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="px-4 py-2.5 font-medium text-foreground">{r.country}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.product}</td>
                    <td className="px-4 py-2.5 text-success text-xs">{r.priceEffect}</td>
                    <td className="px-4 py-2.5">
                      <select value={exportVol[r.country] || r.volume}
                        onChange={e => setExportVol(p => ({ ...p, [r.country]: e.target.value }))}
                        className="bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground">
                        <option value="HIGH">HIGH</option>
                        <option value="NORMAL">NORMAL</option>
                        <option value="LOW">LOW</option>
                      </select>
                    </td>
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