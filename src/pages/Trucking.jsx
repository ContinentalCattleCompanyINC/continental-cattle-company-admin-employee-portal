import { useState, useMemo } from 'react';
import SectionHeader from '@/components/SectionHeader';
import { Info } from 'lucide-react';
import {
  TRUCKING_DEFAULTS, DIESEL_BY_STATE, computeTruckingCosts, freightCostPerHead,
} from '@/lib/truckingConfig';

const US_STATES = Object.keys(DIESEL_BY_STATE).sort();

export default function Trucking() {
  // Route inputs
  const [miles, setMiles]             = useState(300);
  const [originState, setOriginState] = useState('OK');
  const [destState, setDestState]     = useState('NE');
  const [headCount, setHeadCount]     = useState(40);
  const [loadWeight, setLoadWeight]   = useState(48000);
  const [shrinkPct, setShrinkPct]     = useState(2.5);
  const [loadsPerMonth, setLoadsPerMonth] = useState(12);
  const [truckCount, setTruckCount]   = useState(2);

  // Rate / driver inputs
  const [marginPerMile, setMarginPerMile] = useState(TRUCKING_DEFAULTS.marginPerMileAvg);
  const [driverPct, setDriverPct]         = useState(TRUCKING_DEFAULTS.driverPctAvg);
  const [mpg, setMpg]                     = useState(TRUCKING_DEFAULTS.mpgLoaded);

  // Fixed cost overrides (monthly per truck unless noted)
  const [truckPayment, setTruckPayment]       = useState(TRUCKING_DEFAULTS.fixedCosts.truckPayment);
  const [trailerPayment, setTrailerPayment]   = useState(TRUCKING_DEFAULTS.fixedCosts.trailerPayment);
  const [insurance, setInsurance]             = useState(TRUCKING_DEFAULTS.fixedCosts.insurance);
  const [registration, setRegistration]       = useState(TRUCKING_DEFAULTS.fixedCosts.registration);
  const [tires, setTires]                     = useState(TRUCKING_DEFAULTS.fixedCosts.tires);
  const [maintenance, setMaintenance]         = useState(TRUCKING_DEFAULTS.fixedCosts.maintenance);
  const [dotCompliance, setDotCompliance]     = useState(TRUCKING_DEFAULTS.fixedCosts.dotCompliance);
  const [permits, setPermits]                 = useState(TRUCKING_DEFAULTS.fixedCosts.permits);
  const [communication, setCommunication]     = useState(TRUCKING_DEFAULTS.fixedCosts.communication);
  const [parking, setParking]                 = useState(TRUCKING_DEFAULTS.fixedCosts.parking);
  const [other, setOther]                     = useState(TRUCKING_DEFAULTS.fixedCosts.other);

  // Computed diesel avg for route
  const dieselOrigin = DIESEL_BY_STATE[originState] || 3.60;
  const dieselDest   = DIESEL_BY_STATE[destState]   || 3.60;
  const dieselAvg    = (dieselOrigin + dieselDest) / 2;

  const fixedOverrides = {
    truckPayment, trailerPayment, insurance, registration,
    tires, maintenance, dotCompliance, permits, communication, parking, other,
  };

  // Total monthly fixed per fleet
  const fixedPerTruck = Object.values(fixedOverrides).reduce((a, b) => a + b, 0);
  const totalFixedFleet = fixedPerTruck * truckCount;

  const result = useMemo(() => freightCostPerHead({
    miles, headCount, dieselPrice: dieselAvg, mpg, marginPerMile, driverPct,
    loadsPerMonth, fixedOverrides,
  }), [miles, headCount, dieselAvg, mpg, marginPerMile, driverPct, loadsPerMonth,
       truckPayment, trailerPayment, insurance, registration, tires, maintenance,
       dotCompliance, permits, communication, parking, other]);

  const shrinkLbs   = loadWeight * (shrinkPct / 100);
  const shrinkValue = shrinkLbs * 1.35;
  const weeklyProfit  = result.profitPerLoad * loadsPerMonth * truckCount / 4.33;
  const annualProfit  = result.profitPerLoad * loadsPerMonth * truckCount * 12;

  const fmt = (n, d = 2) => (isNaN(n) ? '—' : n.toFixed(d));
  const fmtK = n => n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n.toFixed(0)}`;

  return (
    <div className="p-6 space-y-6 pb-24 md:pb-6">
      <SectionHeader
        title="TRUCKING MODULE"
        subtitle="Semi + 4-deck livestock pot — real-world cost model: pump card + margin, 25–30% driver, old iron"
        badge="Fleet Ops"
      />

      {/* Model overview banner */}
      <div className="flex items-start gap-3 px-4 py-3 bg-primary/5 border border-primary/20 rounded-xl text-xs text-muted-foreground">
        <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <span className="text-primary font-medium">Cost Model: </span>
          Loaded rate = diesel pump card avg ({originState} ${dieselOrigin.toFixed(2)} ↔ {destState} ${dieselDest.toFixed(2)} = avg ${dieselAvg.toFixed(2)}/gal) + ${marginPerMile.toFixed(2)}/mi margin.
          Old equipment ({mpg} MPG loaded, {TRUCKING_DEFAULTS.mpgDeadhead} MPG deadhead, {(TRUCKING_DEFAULTS.deadheadPct * 100).toFixed(0)}% deadhead miles).
          Driver = {(driverPct * 100).toFixed(1)}% of gross load revenue. All fixed costs amortized over {loadsPerMonth} loads/truck/month.
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

        {/* Column 1: Route Inputs */}
        <div className="bg-card border border-border rounded-lg p-5 space-y-3">
          <h3 className="font-bebas text-xl text-foreground">ROUTE & LOAD INPUTS</h3>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Loaded Miles (one way)</label>
            <input type="number" step={10} value={miles} onChange={e => setMiles(+e.target.value || 0)}
              className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Origin State</label>
              <select value={originState} onChange={e => setOriginState(e.target.value)}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-sm">
                {US_STATES.map(s => <option key={s} value={s}>{s} (${DIESEL_BY_STATE[s].toFixed(2)})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Destination State</label>
              <select value={destState} onChange={e => setDestState(e.target.value)}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-sm">
                {US_STATES.map(s => <option key={s} value={s}>{s} (${DIESEL_BY_STATE[s].toFixed(2)})</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Head Count</label>
              <input type="number" step={1} value={headCount} onChange={e => setHeadCount(+e.target.value || 1)}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Load Weight (lb)</label>
              <input type="number" step={1000} value={loadWeight} onChange={e => setLoadWeight(+e.target.value || 0)}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Shrink (%)</label>
            <input type="number" step={0.5} value={shrinkPct} onChange={e => setShrinkPct(+e.target.value || 0)}
              className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-sm" />
          </div>

          <div className="pt-2 border-t border-border">
            <h4 className="font-bebas text-base text-foreground mb-2">RATE & DRIVER</h4>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Margin Above Diesel ($/mi) — Range: $1.30–$1.75</label>
                <input type="number" step={0.05} value={marginPerMile} onChange={e => setMarginPerMile(+e.target.value || 0)}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-sm" />
                <div className="text-xs text-muted-foreground mt-0.5">
                  Loaded rate: <span className="text-primary font-medium">${(dieselAvg / mpg + marginPerMile).toFixed(2)}/mi</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Driver % of Gross — Range: 25–30%</label>
                <input type="number" step={0.005} value={driverPct} onChange={e => setDriverPct(+e.target.value || 0)}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-sm" />
                <div className="text-xs text-muted-foreground mt-0.5">
                  Driver earns: <span className="text-primary font-medium">${fmt(result.driverPayPerLoad)}/load</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">MPG Loaded (3.5–5 old equipment)</label>
                <input type="number" step={0.25} value={mpg} onChange={e => setMpg(+e.target.value || 1)}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-sm" />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <h4 className="font-bebas text-base text-foreground mb-2">FLEET</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Trucks in Fleet</label>
                <input type="number" step={1} value={truckCount} onChange={e => setTruckCount(+e.target.value || 1)}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Loads/Truck/Month</label>
                <input type="number" step={1} value={loadsPerMonth} onChange={e => setLoadsPerMonth(+e.target.value || 1)}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Fixed Costs */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-bebas text-xl text-foreground mb-1">FIXED COSTS / TRUCK / MONTH</h3>
          <p className="text-xs text-muted-foreground mb-3">Semi + 4-deck livestock pot — old equipment</p>
          <div className="space-y-2">
            {[
              { label: 'Truck Payment',         val: truckPayment,   set: setTruckPayment,   note: 'old iron / rebuilt' },
              { label: 'Trailer Payment (pot)',  val: trailerPayment, set: setTrailerPayment, note: '4-deck livestock pot' },
              { label: 'Insurance',              val: insurance,      set: setInsurance,      note: 'CMC + livestock liability' },
              { label: 'Registration / IRP',    val: registration,   set: setRegistration,   note: 'apportioned plates' },
              { label: 'Tires',                 val: tires,          set: setTires,          note: 'steer/drives + pot tires' },
              { label: 'Maintenance / Repair',  val: maintenance,    set: setMaintenance,    note: 'higher on old equipment' },
              { label: 'DOT / FMCSA / IFTA',    val: dotCompliance,  set: setDotCompliance,  note: 'annual filings + ELD' },
              { label: 'Permits (oversize/OW)',  val: permits,        set: setPermits,        note: 'by-state livestock' },
              { label: 'Communication / ELD',   val: communication,  set: setCommunication,  note: 'sat, cell, data plan' },
              { label: 'Parking / Yard',        val: parking,        set: setParking,        note: 'shared' },
              { label: 'Other (scales, wash…)', val: other,          set: setOther,          note: 'livestock wash, contingency' },
            ].map(f => (
              <div key={f.label}>
                <label className="text-xs text-muted-foreground block mb-0.5">{f.label} <span className="text-muted-foreground/60">— {f.note}</span></label>
                <input type="number" step={50} value={f.val}
                  onChange={e => f.set(parseFloat(e.target.value) || 0)}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-sm" />
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Total Fixed / Truck / Month</span>
            <span className="font-bebas text-xl text-primary">${fixedPerTruck.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-muted-foreground">Total Fleet ({truckCount} trucks) / Month</span>
            <span className="font-bebas text-lg text-foreground">${totalFixedFleet.toLocaleString()}</span>
          </div>
        </div>

        {/* Column 3: Cost Breakdown */}
        <div className="space-y-4">

          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="font-bebas text-xl text-foreground mb-3">COST / LOAD BREAKDOWN</h3>
            <div className="space-y-2">
              {[
                { label: 'Fuel (loaded)',          val: result.fuelCostPerLoad,          color: 'warning' },
                { label: `Fuel (deadhead ${(TRUCKING_DEFAULTS.deadheadPct*100).toFixed(0)}%)`, val: result.deadheadFuelCostPerLoad, color: 'warning' },
                { label: 'Driver Pay (% of gross)',val: result.driverPayPerLoad,          color: 'warning', note: `${(driverPct*100).toFixed(1)}% × $${fmt(result.revenuePerLoad)}` },
                { label: 'Misc variable',          val: result.miscVariablePerLoad,       color: 'muted' },
                { label: 'Fixed (amortized)',       val: result.fixedCostPerLoad,          color: 'muted', note: `${loadsPerMonth} loads/mo` },
                { label: 'TOTAL COST / LOAD',      val: result.totalCostPerLoad,          color: 'danger', bold: true },
              ].map(r => (
                <div key={r.label} className={`flex justify-between items-center ${r.bold ? 'border-t border-border pt-2 mt-2' : ''}`}>
                  <div>
                    <span className={`text-sm ${r.bold ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{r.label}</span>
                    {r.note && <div className="text-xs text-muted-foreground/70">{r.note}</div>}
                  </div>
                  <span className={`font-medium ${r.bold ? 'font-bebas text-xl' : 'text-sm'} ${
                    r.color === 'danger' ? 'text-danger' : r.color === 'warning' ? 'text-warning' : 'text-muted-foreground'
                  }`}>${fmt(r.val)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="font-bebas text-xl text-foreground mb-3">RATE STRUCTURE</h3>
            <div className="space-y-2 text-sm">
              {[
                { label: 'Diesel avg (route)',  val: `$${dieselAvg.toFixed(2)}/gal` },
                { label: 'Fuel cost / loaded mi', val: `$${(dieselAvg/mpg).toFixed(3)}/mi` },
                { label: 'Margin over diesel', val: `$${marginPerMile.toFixed(2)}/mi` },
                { label: 'Loaded rate (all-in)', val: `$${fmt(result.ratePerMile)}/mi`, highlight: true },
                { label: `Cost / loaded mi (total)`, val: `$${fmt(result.totalCostPerMile)}/mi` },
                { label: 'Cost / head',  val: `$${fmt(result.costPerHead)}/hd`, highlight: true },
                { label: 'Driver / load', val: `$${fmt(result.driverPayPerLoad)}` },
                { label: 'Driver / head', val: `$${fmt(result.driverPayPerHead)}/hd` },
              ].map(r => (
                <div key={r.label} className={`flex justify-between items-center p-2 rounded ${r.highlight ? 'bg-primary/10 border border-primary/20' : 'bg-secondary/40'}`}>
                  <span className="text-xs text-muted-foreground">{r.label}</span>
                  <span className={`font-medium ${r.highlight ? 'text-primary font-bebas text-lg' : 'text-foreground text-sm'}`}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="font-bebas text-lg text-foreground mb-3">SHRINK IMPACT</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shrink lbs</span>
                <span className="text-danger">{shrinkLbs.toFixed(0)} lb</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shrink value lost</span>
                <span className="text-danger">–${shrinkValue.toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shrink / head</span>
                <span className="text-warning">${headCount > 0 ? (shrinkValue / headCount).toFixed(2) : '—'}/hd</span>
              </div>
            </div>
          </div>
        </div>

        {/* Column 4: P&L Summary */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="font-bebas text-xl text-foreground mb-3">REVENUE / LOAD</h3>
            <div className="space-y-2">
              {[
                { label: 'Revenue / Load', val: `$${fmt(result.revenuePerLoad)}`, color: 'text-success', big: true },
                { label: 'Total Cost / Load', val: `$${fmt(result.totalCostPerLoad)}`, color: 'text-danger', big: true },
              ].map(r => (
                <div key={r.label} className="flex justify-between items-center p-2.5 rounded bg-secondary border border-border">
                  <span className="text-xs text-muted-foreground">{r.label}</span>
                  <span className={`font-bebas text-2xl ${r.color}`}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="font-bebas text-xl text-foreground mb-3">PROFIT SUMMARY</h3>
            <div className="space-y-3">
              {[
                { label: 'Profit / Load', val: fmtK(result.profitPerLoad), color: result.profitPerLoad > 0 ? 'text-success' : 'text-danger' },
                { label: 'Profit / Mile', val: `$${fmt(result.profitPerLoad / (miles || 1), 3)}/mi`, color: result.profitPerLoad > 0 ? 'text-success' : 'text-danger' },
                { label: 'Profit / Head', val: `$${fmt(result.profitPerLoad / (headCount || 1))}/hd`, color: result.profitPerLoad > 0 ? 'text-success' : 'text-danger' },
                { label: `Weekly Profit (${truckCount} trucks)`, val: fmtK(weeklyProfit), color: weeklyProfit > 0 ? 'text-success' : 'text-danger' },
                { label: 'Annual Profit', val: fmtK(annualProfit), color: annualProfit > 0 ? 'text-success' : 'text-danger' },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between p-2.5 bg-secondary/50 rounded">
                  <span className="text-xs text-muted-foreground">{r.label}</span>
                  <span className={`font-bebas text-xl ${r.color}`}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="font-bebas text-lg text-foreground mb-3">TARGETS</h3>
            <div className="space-y-2 text-sm">
              {[
                { label: 'Loaded Rate Target', target: `$${(dieselAvg/mpg + 1.30).toFixed(2)}–$${(dieselAvg/mpg + 1.75).toFixed(2)}/mi`, ok: result.ratePerMile >= dieselAvg/mpg + 1.30 },
                { label: 'Driver Pay Range', target: '25–30% of gross', ok: driverPct >= 0.25 && driverPct <= 0.30 },
                { label: 'Profit / Load', target: '$300–$700', ok: result.profitPerLoad >= 300 },
                { label: 'Cost / Head', target: '<$35/hd (300 mi)', ok: result.costPerHead <= 35 },
                { label: `Break-Even Loads/Mo`, target: `${Math.ceil(fixedPerTruck / Math.max(result.profitPerLoad + result.fixedCostPerLoad, 1))} loads`, ok: loadsPerMonth >= Math.ceil(fixedPerTruck / Math.max(result.profitPerLoad + result.fixedCostPerLoad, 1)) },
              ].map(t => (
                <div key={t.label} className="flex items-center justify-between p-2 rounded border border-border">
                  <div>
                    <div className="text-xs font-medium text-foreground">{t.label}</div>
                    <div className="text-xs text-muted-foreground">{t.target}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${t.ok ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>
                    {t.ok ? 'ON TARGET' : 'REVIEW'}
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