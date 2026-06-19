import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import SectionHeader from '@/components/SectionHeader';
import { TrendingUp, TrendingDown, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { freightCostPerHead, TRUCKING_DEFAULTS } from '@/lib/truckingConfig';

export default function PurchaseCalculator() {
  const { data: marketInputs } = useQuery({
    queryKey: ['marketInputs'],
    queryFn: () => base44.entities.MarketInputs.list('-date', 1),
    initialData: [],
  });

  const latest = marketInputs?.[0] || {};
  const lc = latest.lc_futures || 241.66;
  const gf = latest.gf_futures || 285.40;

  const [inputs, setInputs] = useState({
    purchaseWeight: 400,
    purchasePrice: 285,
    targetWeight: 1200,
    costOfGain: 0.85,
    yardage: 0.45,
    daysOnFeed: 180,
    deathLossPercent: 1.5,
    interestRate: 6.5,
    shrinkPercent: 3,
  });

  // Trucking inputs — uses real semi + pot model
  const [truckMilesIn, setTruckMilesIn]   = useState(300);
  const [truckMilesOut, setTruckMilesOut] = useState(200);
  const [headOnLoad, setHeadOnLoad]       = useState(40);
  const [dieselPrice, setDieselPrice]     = useState(3.60);

  const freightIn  = freightCostPerHead({ miles: truckMilesIn,  headCount: headOnLoad, dieselPrice }).costPerHead;
  const freightOut = freightCostPerHead({ miles: truckMilesOut, headCount: headOnLoad, dieselPrice }).costPerHead;
  const totalFreightPerHead = freightIn + freightOut;

  // Cattle class definitions
  const cattleClasses = [
    {
      name: 'Day-Old Calves',
      purchaseWeightRange: '90-120',
      targetWeightRange: '1200-1400',
      baseROI: 0.75,
      notes: 'Multi-layer internal margins'
    },
    {
      name: 'Light Calves (350-550)',
      purchaseWeightRange: '350-550',
      targetWeightRange: '1100-1300',
      baseROI: 0.22,
      notes: 'Cheapest gain, flexible exit'
    },
    {
      name: 'Medium Calves (550-750)',
      purchaseWeightRange: '550-750',
      targetWeightRange: '1200-1400',
      baseROI: 0.18,
      notes: 'Balanced risk/reward'
    },
    {
      name: 'Cull Cows',
      purchaseWeightRange: '1200-1400',
      targetWeightRange: '1250-1400',
      baseROI: 0.25,
      notes: 'Heavy carcass, tight supply'
    },
  ];

  // Calculate ROI for each scenario
  const scenarios = useMemo(() => {
    // Purchase and freight costs
    const purchase_cost = (inputs.purchaseWeight * inputs.purchasePrice) / 100;
    const freight_cost = totalFreightPerHead;
    
    // Feed and yardage
    const total_feed_cost = inputs.costOfGain * (inputs.targetWeight - inputs.purchaseWeight);
    const yardage_cost = inputs.yardage * inputs.daysOnFeed;
    
    // Interest on average capital (purchase + freight)
    const avg_capital = purchase_cost + freight_cost + (total_feed_cost / 2);
    const interest_cost = (avg_capital * inputs.interestRate / 100 * inputs.daysOnFeed) / 365;
    
    // Death loss (on total cost invested)
    const total_before_death = purchase_cost + freight_cost + total_feed_cost + yardage_cost;
    const death_loss_cost = total_before_death * (inputs.deathLossPercent / 100);
    
    // Total cost per head (assuming survive)
    const total_cost_per_head = purchase_cost + freight_cost + total_feed_cost + yardage_cost + interest_cost + death_loss_cost;
    
    // Revenue calculation
    const sellPrice = lc;
    const sale_weight_with_shrink = inputs.targetWeight * (1 - inputs.shrinkPercent / 100);
    const revenue_per_head = (sale_weight_with_shrink * sellPrice) / 100;
    
    const profit_per_head = revenue_per_head - total_cost_per_head;
    const roi_percent = (profit_per_head / total_cost_per_head) * 100;

    return cattleClasses.map(cattle => {
      const cattle_profit = profit_per_head * (cattle.baseROI > 0 ? cattle.baseROI / 0.22 : 1);
      const cattle_roi = (cattle_profit / total_cost_per_head) * 100;
      
      return {
        ...cattle,
        totalCost: total_cost_per_head,
        purchaseCost: purchase_cost,
        freightCost: freight_cost,
        feedCost: total_feed_cost,
        yardageCost: yardage_cost,
        interestCost: interest_cost,
        deathLossCost: death_loss_cost,
        profit: cattle_profit,
        roi: Math.max(cattle_roi, -100),
        revenue: revenue_per_head
      };
    });
  }, [inputs, lc]);

  const bestROI = useMemo(() => {
    return scenarios.reduce((best, current) => 
      current.roi > best.roi ? current : best
    );
  }, [scenarios]);

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <SectionHeader 
        title="PURCHASE & PLACEMENT ROI CALCULATOR"
        subtitle="Evaluate the best ROI for different cattle acquisition and placement strategies"
      />

      {/* Input Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inputs */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-bebas text-lg text-foreground mb-4">PURCHASE PARAMETERS</h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Purchase Weight (lbs)</label>
                <input
                  type="number"
                  value={inputs.purchaseWeight}
                  onChange={(e) => setInputs({...inputs, purchaseWeight: Number(e.target.value)})}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">Purchase Price ($/cwt)</label>
                <input
                  type="number"
                  value={inputs.purchasePrice}
                  onChange={(e) => setInputs({...inputs, purchasePrice: Number(e.target.value)})}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">Target Weight (lbs)</label>
                <input
                  type="number"
                  value={inputs.targetWeight}
                  onChange={(e) => setInputs({...inputs, targetWeight: Number(e.target.value)})}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">Cost of Gain ($/lb)</label>
                <input
                  type="number"
                  step="0.01"
                  value={inputs.costOfGain}
                  onChange={(e) => setInputs({...inputs, costOfGain: Number(e.target.value)})}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">Yardage ($/head/day)</label>
                <input
                  type="number"
                  step="0.01"
                  value={inputs.yardage}
                  onChange={(e) => setInputs({...inputs, yardage: Number(e.target.value)})}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">Days on Feed</label>
                <input
                  type="number"
                  value={inputs.daysOnFeed}
                  onChange={(e) => setInputs({...inputs, daysOnFeed: Number(e.target.value)})}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div className="pt-3 border-t border-border">
                <h4 className="text-xs font-semibold text-foreground mb-3">ADDITIONAL COSTS</h4>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Death Loss (%)</label>
                  <input type="number" step="0.1" value={inputs.deathLossPercent}
                    onChange={(e) => setInputs({...inputs, deathLossPercent: Number(e.target.value)})}
                    className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground" />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Interest Rate (%/year)</label>
                  <input type="number" step="0.1" value={inputs.interestRate}
                    onChange={(e) => setInputs({...inputs, interestRate: Number(e.target.value)})}
                    className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground" />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Shrink on Sale (%)</label>
                  <input type="number" step="0.1" value={inputs.shrinkPercent}
                    onChange={(e) => setInputs({...inputs, shrinkPercent: Number(e.target.value)})}
                    className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground" />
                </div>
              </div>

              {/* Trucking Calculator */}
              <div className="pt-3 border-t border-border">
                <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-primary" /> TRUCKING (Semi + 4-deck pot)
                </h4>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Haul In — Miles</label>
                    <input type="number" step={10} value={truckMilesIn} onChange={e => setTruckMilesIn(+e.target.value || 0)}
                      className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Haul Out — Miles</label>
                    <input type="number" step={10} value={truckMilesOut} onChange={e => setTruckMilesOut(+e.target.value || 0)}
                      className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Head / Load</label>
                    <input type="number" step={1} value={headOnLoad} onChange={e => setHeadOnLoad(+e.target.value || 1)}
                      className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Diesel avg $/gal</label>
                    <input type="number" step={0.05} value={dieselPrice} onChange={e => setDieselPrice(+e.target.value || 3.60)}
                      className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground" />
                  </div>
                  <div className="bg-primary/5 border border-primary/20 rounded p-2 text-xs space-y-1">
                    <div className="flex justify-between"><span className="text-muted-foreground">Freight In</span><span className="text-foreground">${freightIn.toFixed(2)}/hd</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Freight Out</span><span className="text-foreground">${freightOut.toFixed(2)}/hd</span></div>
                    <div className="flex justify-between border-t border-primary/20 pt-1"><span className="text-primary font-medium">Total Freight</span><span className="text-primary font-bold">${totalFreightPerHead.toFixed(2)}/hd</span></div>
                    <div className="text-muted-foreground/70 pt-0.5">Rate: ${freightCostPerHead({miles:truckMilesIn, headCount:headOnLoad, dieselPrice}).ratePerMile.toFixed(2)}/mi | Driver: ${freightCostPerHead({miles:truckMilesIn, headCount:headOnLoad, dieselPrice}).driverPayPerLoad.toFixed(0)}/load in</div>
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground pt-3 border-t border-border">
                <div className="mb-1">Live Cattle: ${lc}/cwt</div>
                <div>Date: {format(new Date(), 'MMM d, yyyy')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Best ROI Highlight */}
        <div className="lg:col-span-2">
          <div className="bg-gradient-to-br from-success/10 to-primary/5 border border-success/20 rounded-lg p-6">
            <h3 className="font-bebas text-2xl text-success mb-4">BEST ROI OPPORTUNITY</h3>
            
            <div className="space-y-4">
              <div>
                <div className="text-muted-foreground text-sm mb-1">Cattle Class</div>
                <div className="font-bebas text-2xl text-foreground">{bestROI.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{bestROI.notes}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-muted-foreground text-xs mb-1">ROI</div>
                  <div className="font-bebas text-3xl text-success">{bestROI.roi.toFixed(1)}%</div>
                </div>

                <div>
                  <div className="text-muted-foreground text-xs mb-1">Profit/Head</div>
                  <div className="font-bebas text-2xl text-success">${bestROI.profit.toFixed(2)}</div>
                </div>

                <div>
                  <div className="text-muted-foreground text-xs mb-1">Total Cost/Head</div>
                  <div className="text-sm text-foreground">${bestROI.totalCost.toFixed(2)}</div>
                </div>

                <div>
                  <div className="text-muted-foreground text-xs mb-1">Sale Revenue/Head</div>
                  <div className="text-sm text-foreground">${bestROI.revenue.toFixed(2)}</div>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="mt-4 pt-4 border-t border-success/20">
                <div className="text-xs text-muted-foreground mb-2">COST BREAKDOWN</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Purchase</span>
                    <span className="text-foreground">${bestROI.purchaseCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Freight In ({truckMilesIn} mi)</span>
                    <span className="text-foreground">${freightIn.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Freight Out ({truckMilesOut} mi)</span>
                    <span className="text-foreground">${freightOut.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Feed</span>
                    <span className="text-foreground">${bestROI.feedCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Yardage</span>
                    <span className="text-foreground">${bestROI.yardageCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Interest</span>
                    <span className="text-foreground">${bestROI.interestCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Death Loss</span>
                    <span className="text-foreground">${bestROI.deathLossCost.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scenario Comparison */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="font-bebas text-xl text-foreground mb-4">ROI COMPARISON BY CATTLE CLASS</h3>
        
        <div className="space-y-2">
          {scenarios.sort((a, b) => b.roi - a.roi).map((scenario) => (
            <div
              key={scenario.name}
              className={`p-4 rounded-lg border transition-all ${
                scenario.name === bestROI.name
                  ? 'bg-success/10 border-success/20'
                  : 'bg-secondary/30 border-border hover:bg-secondary/50'
              }`}
            >
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <div className="font-medium text-foreground">{scenario.name}</div>
                  <div className="text-xs text-muted-foreground">{scenario.purchaseWeightRange} lbs → {scenario.targetWeightRange} lbs</div>
                </div>

                <div className="text-right">
                  <div className={`font-bebas text-xl flex items-center gap-1 justify-end ${
                    scenario.roi >= 20 ? 'text-success' : scenario.roi >= 0 ? 'text-warning' : 'text-danger'
                  }`}>
                    {scenario.roi >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {scenario.roi.toFixed(1)}%
                  </div>
                </div>

                <div className="text-right min-w-[120px]">
                  <div className="text-xs text-muted-foreground">Profit/Head</div>
                  <div className={`text-sm font-medium ${
                    scenario.profit >= 0 ? 'text-success' : 'text-danger'
                  }`}>
                    ${scenario.profit.toFixed(2)}
                  </div>
                </div>

                <div className="text-right min-w-[100px]">
                  <div className="text-xs text-muted-foreground">Cost/Head</div>
                  <div className="text-sm text-foreground">${scenario.totalCost.toFixed(2)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}