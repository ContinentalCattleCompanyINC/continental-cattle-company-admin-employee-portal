import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import SectionHeader from '@/components/SectionHeader';
import { Sparkles, Wheat, Syringe, RefreshCw, ChevronDown, ChevronRight, Download, AlertCircle, TrendingUp, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

const PLAN_TYPES = [
  { value: 'full', label: 'Full Program (Ration + Vaccination)', icon: Sparkles },
  { value: 'ration', label: 'Feed Ration Only', icon: Wheat },
  { value: 'vaccination', label: 'Vaccination Schedule Only', icon: Syringe },
];

const FOCUS = [
  { value: 'roi', label: 'Max ROI' },
  { value: 'grade', label: 'Max Grade & Yield (Prime/Choice)' },
  { value: 'adr', label: 'Max ADR / Speed to Market' },
  { value: 'cost', label: 'Minimize Cost of Gain' },
  { value: 'balanced', label: 'Balanced (Grade + Cost + ROI)' },
];

function PlanSection({ title, icon: SectionIcon, color, content, defaultOpen = false }) {
  const Icon = SectionIcon;
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`border rounded-xl overflow-hidden ${color}`}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors text-left">
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5" />
          <span className="font-bebas text-lg tracking-wide">{title}</span>
        </div>
        {open ? <ChevronDown className="w-4 h-4 opacity-60" /> : <ChevronRight className="w-4 h-4 opacity-60" />}
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-white/10">
          <div className="mt-4 prose prose-sm prose-invert max-w-none text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {content}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AIFeedPlanner() {
  const { user } = useAuth();
  const [selectedLot, setSelectedLot] = useState('');
  const [planType, setPlanType] = useState('full');
  const [focus, setFocus] = useState('balanced');
  const [daysOnFeed, setDaysOnFeed] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [environment, setEnvironment] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);

  const { data: lots = [] } = useQuery({
    queryKey: ['activeLots'],
    queryFn: () => base44.entities.CattleLot.filter({ status: 'active' }, '-purchase_date', 200),
  });

  const { data: feedProtocols = [] } = useQuery({
    queryKey: ['feedProtocols'],
    queryFn: () => base44.entities.FeedProtocol.list('-cost_per_ton', 50),
  });

  const { data: healthProtocols = [] } = useQuery({
    queryKey: ['healthProtocols'],
    queryFn: () => base44.entities.HealthProtocol.list('protocol_name', 50),
  });

  const { data: marketInputs = [] } = useQuery({
    queryKey: ['marketInputs'],
    queryFn: () => base44.entities.MarketInputs.list('-date', 1),
  });

  const { data: healthEvents = [] } = useQuery({
    queryKey: ['healthEvents', selectedLot],
    queryFn: () => selectedLot
      ? base44.entities.LotHealthEvent.filter({ cattle_lot_id: selectedLot }, '-event_date', 50)
      : Promise.resolve([]),
    enabled: !!selectedLot,
  });

  const lot = lots.find(l => l.id === selectedLot);
  const market = marketInputs[0];

  const buildPrompt = () => {
    const lotInfo = lot ? `
CATTLE LOT:
- Class: ${lot.cattle_class}
- Head Count: ${lot.head_count}
- Current Weight: ${lot.current_weight || 'unknown'} lbs/hd
- Purchase Weight: ${lot.purchase_weight} lbs/hd
- Target Weight: ${targetWeight || lot.target_weight || 'not set'} lbs/hd
- Stage: ${lot.stage}
- Yard: ${lot.yard || 'unknown'}, Pen: ${lot.pen || 'unknown'}
- Entity: ${lot.entity || 'unknown'}
- Cost of Gain: $${lot.cog || 'unknown'}/lb
- Yardage: $${lot.yardage || 0.45}/hd/day
- Days on Feed Target: ${daysOnFeed || 'optimize for target weight'}
` : 'No specific lot selected — generate general best-practice program.';

    const marketInfo = market ? `
CURRENT MARKET CONDITIONS (${market.date}):
- Live Cattle Futures: $${market.lc_futures}/cwt
- Feeder Cattle Futures: $${market.gf_futures}/cwt
- Choice Cutout: $${market.choice_cutout}/cwt
- Select Cutout: $${market.select_cutout}/cwt
- Prime Cutout: $${market.prime_cutout}/cwt
- Corn Price: $${market.corn_price}/bu
- Soybean Meal: $${market.sbm_price}/ton
- 90s Trim: $${market.trim_90s}/lb
- Import Volume: ${market.import_volume}, Export Volume: ${market.export_volume}
` : 'No live market data available — use current industry averages.';

    const feedInfo = feedProtocols.length > 0 ? `
AVAILABLE FEED COMMODITIES:
${feedProtocols.map(f => `- ${f.commodity_name}: $${f.cost_per_ton}/ton, TDN ${f.tdn_percent}%, CP ${f.cp_percent}%, ${f.daily_intake_head}lbs DMI/hd/day`).join('\n')}
` : '';

    const healthInfo = healthProtocols.length > 0 ? `
EXISTING HEALTH PROTOCOLS ON RECORD:
${healthProtocols.map(p => `- ${p.protocol_name} (${p.cattle_class}): ${p.action} at ${p.timing}, Product: ${p.product}, Dosage: ${p.dosage}, Cost: $${p.cost_per_head}/hd`).join('\n')}
` : '';

    const perfHistory = healthEvents.length > 0 ? `
HEALTH EVENT HISTORY FOR THIS LOT:
${healthEvents.slice(0, 20).map(e => `- ${e.event_date}: ${e.event_type}, ${e.head_affected} hd affected, ${e.diagnosis ? 'Dx: ' + e.diagnosis : ''} ${e.treatment ? 'Tx: ' + e.treatment : ''} ${e.cost_per_head ? '$' + e.cost_per_head + '/hd' : ''}`).join('\n')}
` : '';

    const envInfo = environment ? `\nENVIRONMENT / NOTES: ${environment}` : '';
    const extra = additionalContext ? `\nADDITIONAL CONTEXT: ${additionalContext}` : '';

    return `You are a world-class livestock nutritionist and cattle herd health veterinarian with deep expertise in beef production economics. 

Generate a comprehensive, highly specific ${planType === 'full' ? 'FEED RATION AND VACCINATION SCHEDULE' : planType === 'ration' ? 'FEED RATION PROGRAM' : 'VACCINATION AND HEALTH SCHEDULE'} optimized for: ${FOCUS.find(f => f.value === focus)?.label.toUpperCase()}.

${lotInfo}
${marketInfo}
${feedInfo}
${healthInfo}
${perfHistory}
${envInfo}
${extra}

Produce your output in the following structured sections:

${planType !== 'vaccination' ? `## 🌾 RATION PROGRAM

Provide a phase-by-phase ration (starter/grower/finisher or whatever phases fit the cattle class and stage):
- For each phase: days range, daily DMI (lbs), ingredient list with exact % and lbs/hd/day, TDN%, CP%, NEg, estimated ADG, estimated cost/hd/day
- Specify any additives (ionophores, beta-agonists, implants, buffers, vitamins/minerals)
- Include water requirements and bunk management tips
- Justify how this ration maximizes ${FOCUS.find(f => f.value === focus)?.label} given current corn/SBM prices and cutout values
- Flag any feed cost risk if futures move ±10%

` : ''}${planType !== 'ration' ? `## 💉 VACCINATION & HEALTH PROTOCOL

Provide a complete timeline from arrival/processing through market:
- Day 0 (Processing): vaccines, implants, parasite control, ID
- Day 14-21 boosters
- Mid-feeding re-implant schedule
- Pre-shipment health checks
- BQA-compliant withdrawal times for all products
- Specific product recommendations (e.g. Pyramid 5+Presponse HM, Dectomax, Ralgro, Optaflexx)
- Estimated total health cost per head

` : ''}## 📊 ECONOMIC PROJECTION

- Estimated total cost of production per head (feed + health + yardage + death loss)
- Projected sell weight and grade distribution (% Prime/Choice/Select)
- Projected revenue at current futures/cutout
- Estimated net profit per head and total lot profit
- ROI %
- Break-even sell price ($/cwt)
- Key assumptions and risks

## ⚡ AI RECOMMENDATIONS

- Top 3 specific adjustments to make RIGHT NOW based on market conditions
- Red flags or risks to watch
- Optimal days-on-feed / target weight recommendation given current futures spread
- Any lot-specific concerns based on health event history`;
  };

  const generateFallbackPlan = () => {
    const l = lot;
    const mkt = market;
    const buyWeight = l?.current_weight || l?.purchase_weight || 700;
    const sellWeight = targetWeight ? Number(targetWeight) : (l?.target_weight || 1250);
    const gainLbs = Math.max(sellWeight - buyWeight, 0);
    const dof = daysOnFeed ? Number(daysOnFeed) : Math.round(gainLbs / 2.8);
    const cog = l?.cog || 0.95;
    const yardage = l?.yardage || 0.45;
    const feedCost = gainLbs * cog;
    const yardageCost = yardage * dof;
    const healthCostHd = healthProtocols.length > 0
      ? healthProtocols.reduce((s, p) => s + (p.cost_per_head || 0), 0)
      : 55;
    const buyPricePerHead = (l?.purchase_price || 150) / 100 * buyWeight;
    const totalCostPerHead = buyPricePerHead + feedCost + yardageCost + healthCostHd + 35;
    const lc = mkt?.lc_futures || 241;
    const corn = mkt?.corn_price || 4.22;
    const revenuePerHead = sellWeight * (lc / 100);
    const profitPerHead = revenuePerHead - totalCostPerHead;
    const roi = totalCostPerHead > 0 ? (profitPerHead / totalCostPerHead * 100) : 0;
    const isHolstein = l?.cattle_class?.includes('holstein');
    const targetGrade = isHolstein ? 'Select / Low Choice' : 'Choice / Prime';
    const dmiLbs = Math.round(buyWeight * 0.025);

    const feedList = feedProtocols.length > 0
      ? feedProtocols.map(f => `• ${f.commodity_name}: $${f.cost_per_ton}/ton | TDN ${f.tdn_percent || '—'}% | CP ${f.cp_percent || '—'}% | ${f.daily_intake_head || '—'} lbs DMI/hd/day`).join('\n')
      : `• Corn (dry-rolled): ~$${(corn * 8.5).toFixed(0)}/ton | TDN 88% | CP 9% | 12–15 lbs/hd/day
• Alfalfa Hay: ~$220/ton | TDN 58% | CP 18% | 4–6 lbs/hd/day
• Soybean Meal: ~$${mkt?.sbm_price || 340}/ton | TDN 82% | CP 47% | 1–2 lbs/hd/day
• Distillers Grains: ~$150/ton | TDN 85% | CP 28% | 5–8 lbs/hd/day
• Mineral/Vitamin mix: ~$600/ton | 0.25 lbs/hd/day`;

    const healthList = healthProtocols.length > 0
      ? healthProtocols.map(p => `• ${p.protocol_name} | ${p.cattle_class} | ${p.action} at ${p.timing}${p.product ? ' | Product: ' + p.product : ''}${p.dosage ? ' | ' + p.dosage : ''}${p.cost_per_head ? ' | $' + p.cost_per_head + '/hd' : ''}`).join('\n')
      : `• Day 0 Processing: IBR-BVD-PI3-BRSV + Mannheimia (Pyramid 5+Presponse HM), 5-way clostridial
• Day 0: Ivermectin pour-on, Implant (Ralgro or Component E-H)
• Day 14–21: Booster vaccines (IBR-BVD)
• Day 60–90: Re-implant (Component T-H or Optaflexx depending on class)
• Pre-ship: BQA-compliant health check, confirm withdrawal times
• Est. health cost: $45–$65/hd`;

    const rationProgram = `DATA-DRIVEN RATION PLAN
${l ? `Lot: ${l.lot_id || l.cattle_class} | ${l.head_count} hd | ${buyWeight} lbs → ${sellWeight} lbs | Stage: ${l.stage}` : 'General program — no specific lot selected'}

AVAILABLE FEED COMMODITIES ON RECORD:
${feedList}

PHASE 1 — RECEIVING / STARTER (Days 1–21)
DMI: ${Math.round(dmiLbs * 0.75)} lbs/hd/day | TDN: 68–72% | CP: 14–16%
• High roughage (35–40%), low-starch adaptation
• Focus: stress recovery, rumen adaptation
• Administer receiving medications per health protocol
• Estimated ADG: 1.5–2.0 lbs/hd/day
• Est. feed cost: $${(0.75 * dmiLbs * (corn / 56 * 8.5 / 2000 + 0.10)).toFixed(2)}/hd/day

PHASE 2 — GROWER / GROWING (Days 22–${Math.round(dof * 0.55)})
DMI: ${dmiLbs} lbs/hd/day | TDN: 75–78% | CP: 12–13%
• Mid-grain ration, reduce hay, add distillers
• Target ADG: 2.8–3.2 lbs/hd/day
• Ionophore (Rumensin or Bovatec) added
• Est. feed cost: $${(dmiLbs * 0.085).toFixed(2)}/hd/day

PHASE 3 — FINISHER (Days ${Math.round(dof * 0.55)}–${dof})
DMI: ${Math.round(dmiLbs * 1.1)} lbs/hd/day | TDN: 82–86% | CP: 11–12%
• High-grain (85–90% concentrate), min roughage (1–1.5% BW)
• Beta-agonist consideration at Day ${dof - 28} (if ${isHolstein ? 'not going export market' : 'grid allows'})
• Target ADG: 3.5–4.0 lbs/hd/day
• Est. feed cost: $${(dmiLbs * 1.1 * 0.092).toFixed(2)}/hd/day

BUNK MANAGEMENT:
• Slick bunk management — empty 0–1x/day at finishing
• Check water: minimum 2 gal/lb DMI (${Math.round(dmiLbs * 2)} gal/hd/day at peak)
• Watch for bloat and acidosis indicators, especially in high-grain phase

TOTAL FEED COST ESTIMATE: $${feedCost.toFixed(0)}/hd over ${dof} days ($${(feedCost/dof).toFixed(2)}/hd/day avg)`;

    const vaccinationSchedule = `DATA-DRIVEN HEALTH PROTOCOL
${l ? `Lot: ${l.lot_id || l.cattle_class} | Cattle Class: ${l.cattle_class}` : 'General BQA-compliant program'}

PROTOCOLS ON RECORD:
${healthList}

STANDARD BQA TIMELINE (if no specific protocols configured):
• Day 0 — PROCESSING: Weigh, tag, castrate/implant, dehorn if needed
  - Respiratory 5-way (IBR, BVD1&2, PI3, BRSV)
  - 7-way Clostridial (Blackleg, Malignant Edema, etc.)
  - Parasite control (Dectomax or Ivomec)
  - Implant: Ralgro or Component E-H (stocker), Synovex S (feedlot)
  - BQA injection sites: Neck triangle only
• Day 14–21 — BOOSTERS: IBR-BVD, Haemophilus
• Day 60–90 — RE-IMPLANT: Component T-H or Revalor-G
• Day ${dof - 28} — TERMINAL IMPLANT (if applicable): Optaflexx 45, check withdrawal 28 days pre-slaughter
• Pre-Ship — Health inspection, check withdrawal compliance

ESTIMATED TOTAL HEALTH COST: $${healthCostHd.toFixed(0)}/hd`;

    const econProjection = `ECONOMIC PROJECTION (DATA-DRIVEN)
${l ? `Lot: ${l.lot_id || l.cattle_class} | Focus: ${FOCUS.find(f => f.value === focus)?.label}` : 'General estimate'}

COST BREAKDOWN:
• Purchase cost:         $${buyPricePerHead.toFixed(0)}/hd  (${buyWeight} lbs @ $${l?.purchase_price || 150}/cwt)
• Feed cost:             $${feedCost.toFixed(0)}/hd  (${gainLbs} lb gain @ $${cog}/lb COG)
• Yardage:               $${yardageCost.toFixed(0)}/hd  ($${yardage}/hd/day × ${dof} days)
• Health/meds:           $${healthCostHd.toFixed(0)}/hd
• Freight/misc:          $35/hd (est.)
─────────────────────────────────────────
TOTAL COST:              $${totalCostPerHead.toFixed(0)}/hd

REVENUE PROJECTION:
• Sell weight:           ${sellWeight} lbs/hd
• LC Futures:            $${lc}/cwt ${mkt?.date ? '(' + mkt.date + ')' : ''}
• Gross revenue:         $${revenuePerHead.toFixed(0)}/hd
• Pencil shrink (3%):    -$${(revenuePerHead * 0.03).toFixed(0)}/hd
• Net revenue:           $${(revenuePerHead * 0.97).toFixed(0)}/hd

NET PROFIT:              $${((revenuePerHead * 0.97) - totalCostPerHead).toFixed(0)}/hd
ROI:                     ${roi.toFixed(1)}%
BREAKEVEN:               $${(totalCostPerHead / sellWeight * 100).toFixed(2)}/cwt
${l?.head_count ? `TOTAL LOT PROFIT:        $${((revenuePerHead * 0.97 - totalCostPerHead) * l.head_count).toFixed(0)}` : ''}

EXPECTED GRADE: ${targetGrade}
CURRENT MARKET SIGNAL: ${lc > 240 ? '✓ STRONG — premium sell window' : lc > 225 ? '▲ MODERATE — watch basis' : '⚠ WEAK — consider timing'}
${mkt?.choice_cutout ? `Cutout Spread: $${(mkt.choice_cutout - lc).toFixed(2)}/cwt (${mkt.choice_cutout - lc > 80 ? 'WIDE — packers bidding up' : mkt.choice_cutout - lc > 50 ? 'NORMAL' : 'NARROW — packer margin tight'})` : ''}`;

    const recommendations = `DATA-DRIVEN RECOMMENDATIONS
Focus: ${FOCUS.find(f => f.value === focus)?.label || 'Balanced'}

TOP PRIORITIES RIGHT NOW:
${lc > 240 ? '1. ✓ SELL WINDOW OPEN — LC futures strong at $' + lc + '/cwt. Prioritize finishing and marketing ready cattle.' : '1. ⚠ Market below $240 — weigh holding cost vs. current price before committing to sell date.'}
${corn < 4.50 ? '2. ✓ Corn favorable at $' + corn + '/bu — high-grain finishing ration is cost-effective. Consider locking in feed prices.' : '2. ⚠ Corn elevated at $' + corn + '/bu — evaluate alternative energy sources (distillers, DDG, beet pulp) to protect COG.'}
${mkt?.sbm_price && mkt.sbm_price > 350 ? '3. ⚠ SBM expensive at $' + mkt.sbm_price + '/ton — reduce protein via cheap amino acid sources (urea, DDG) where possible.' : '3. ✓ SBM manageable — maintain protein levels per protocol.'}
${gainLbs > 400 ? '4. Plan re-implant at Day ' + Math.round(dof * 0.55) + ' to maximize ADG in finishing phase.' : '4. Monitor bunk daily — adjust delivery to prevent acidosis as cattle approach finishing weights.'}
5. Track morbidity closely — pull rate >10% signals health protocol review needed.
${healthEvents.length > 0 ? '6. ⚠ ' + healthEvents.length + ' health events logged — review patterns for recurring diagnosis and adjust treatment protocol.' : '6. ✓ No major health events on record for this lot.'}

OPTIMAL MARKETING TARGET:
• ${sellWeight} lbs/hd live — ${dof} days on feed
• Grade target: ${targetGrade}
• Watch for: ${mkt?.import_volume === 'high' ? '⚠ High import volume — trim/lean prices pressured' : mkt?.export_volume === 'high' ? '✓ Strong export demand — premium cattle in demand' : 'Normal trade conditions'}

NOTE: This is a data-driven analysis generated from your actual lot, market, and protocol data. For AI-generated personalized recommendations, integration credits are required.`;

    return {
      ration_program: rationProgram,
      vaccination_schedule: vaccinationSchedule,
      economic_projection: econProjection,
      ai_recommendations: recommendations,
      summary: `${l ? `Lot ${l.lot_id || l.cattle_class} (${l.head_count} hd)` : 'General program'}: Estimated ${roi.toFixed(1)}% ROI with $${profitPerHead.toFixed(0)}/hd projected profit over ${dof} days on feed. Total cost: $${totalCostPerHead.toFixed(0)}/hd. Sell target: ${sellWeight} lbs @ current LC futures of $${lc}/cwt. Grade target: ${targetGrade}. Feed cost of gain: $${cog}/lb using ${feedProtocols.length > 0 ? feedProtocols.length + ' commodities on record' : 'standard TMR blend'}.`,
      estimated_profit_per_head: Math.round((revenuePerHead * 0.97) - totalCostPerHead),
      estimated_roi_percent: parseFloat(roi.toFixed(1)),
      estimated_cost_per_head: Math.round(totalCostPerHead),
      target_grade: targetGrade,
    };
  };

  const generatePlan = async () => {
    if (!selectedLot && lots.length > 0) {
      toast.error('Please select a cattle lot');
      return;
    }
    setLoading(true);
    setPlan(null);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: buildPrompt(),
        model: 'claude_sonnet_4_6',
        response_json_schema: {
          type: 'object',
          properties: {
            ration_program: { type: 'string' },
            vaccination_schedule: { type: 'string' },
            economic_projection: { type: 'string' },
            ai_recommendations: { type: 'string' },
            summary: { type: 'string', description: 'One paragraph executive summary' },
            estimated_profit_per_head: { type: 'number' },
            estimated_roi_percent: { type: 'number' },
            estimated_cost_per_head: { type: 'number' },
            target_grade: { type: 'string' },
          }
        }
      });
      setPlan(result);
      toast.success('AI plan generated');
    } catch (err) {
      const fallback = generateFallbackPlan();
      setPlan({ ...fallback, _fallback: true });
      toast.info('AI unavailable — showing data-driven analysis from your records');
    }
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <SectionHeader
        title="AI FEED & HEALTH PLANNER"
        subtitle="AI-optimized rations, vaccination schedules, and economic projections per lot"
        badge="AI POWERED"
      />

      {/* Config Panel */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <h3 className="font-bebas text-primary text-lg">CONFIGURE AI PLAN</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Lot selector */}
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Cattle Lot</label>
            <select className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
              value={selectedLot} onChange={e => setSelectedLot(e.target.value)}>
              <option value="">General best-practice program (no specific lot)</option>
              {lots.map(l => (
                <option key={l.id} value={l.id}>
                  {l.lot_id || l.cattle_class} — {l.head_count} hd @ {l.current_weight || l.purchase_weight} lbs — {l.yard} Pen {l.pen}
                </option>
              ))}
            </select>
          </div>

          {/* Plan type */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Plan Type</label>
            <div className="space-y-2">
              {PLAN_TYPES.map(pt => (
                <label key={pt.value} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-secondary/40 transition-colors">
                  <input type="radio" name="planType" value={pt.value} checked={planType === pt.value}
                    onChange={() => setPlanType(pt.value)} className="accent-primary" />
                  <pt.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{pt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Optimization focus */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Optimization Focus</label>
            <div className="space-y-2">
              {FOCUS.map(f => (
                <label key={f.value} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-secondary/40 transition-colors">
                  <input type="radio" name="focus" value={f.value} checked={focus === f.value}
                    onChange={() => setFocus(f.value)} className="accent-primary" />
                  <span className="text-sm text-foreground">{f.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Target Days on Feed</label>
            <input type="number" placeholder="e.g. 180" className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
              value={daysOnFeed} onChange={e => setDaysOnFeed(e.target.value)} />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Target Sell Weight (lbs/hd)</label>
            <input type="number" placeholder="e.g. 1350" className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
              value={targetWeight} onChange={e => setTargetWeight(e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Environment / Climate / Region</label>
            <input placeholder="e.g. Southern Plains, summer heat, open lot, no shade" className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
              value={environment} onChange={e => setEnvironment(e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Additional Context / Special Instructions</label>
            <textarea rows={2} placeholder="e.g. High morbidity last 2 weeks, buyer wants CAB-eligible, avoid beta-agonists for export market..." className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground resize-none"
              value={additionalContext} onChange={e => setAdditionalContext(e.target.value)} />
          </div>
        </div>

        {/* Context preview */}
        {lot && (
          <div className="flex flex-wrap gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg text-xs">
            <span className="text-primary font-medium">Lot Context Loaded:</span>
            <span className="text-muted-foreground">{lot.cattle_class}</span>
            <span className="text-muted-foreground">{lot.head_count} hd</span>
            <span className="text-muted-foreground">{lot.current_weight || lot.purchase_weight} lbs/hd</span>
            <span className="text-muted-foreground">Stage: {lot.stage}</span>
            {market && <span className="text-success">+ Live market data</span>}
            {feedProtocols.length > 0 && <span className="text-success">+ {feedProtocols.length} feed commodities</span>}
            {healthProtocols.length > 0 && <span className="text-success">+ {healthProtocols.length} health protocols</span>}
            {healthEvents.length > 0 && <span className="text-warning">+ {healthEvents.length} health events history</span>}
          </div>
        )}

        <button
          onClick={generatePlan}
          disabled={loading}
          className="flex items-center gap-3 px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bebas text-lg tracking-wide hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {loading ? 'GENERATING AI PLAN...' : 'GENERATE AI PLAN'}
        </button>
        {loading && (
          <p className="text-xs text-muted-foreground">Analyzing lot data, market conditions, feed costs, health history, futures — this takes 15–30 seconds...</p>
        )}
      </div>

      {/* Results */}
      {plan && (
        <div className="space-y-4">
          {/* Summary KPIs */}
          {(plan.estimated_profit_per_head || plan.estimated_roi_percent || plan.estimated_cost_per_head) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Est. Profit / Head', value: plan.estimated_profit_per_head != null ? `${plan.estimated_profit_per_head >= 0 ? '+' : ''}$${plan.estimated_profit_per_head.toFixed(0)}` : '—', color: plan.estimated_profit_per_head >= 0 ? 'text-success' : 'text-danger' },
                { label: 'Est. ROI %', value: plan.estimated_roi_percent != null ? `${plan.estimated_roi_percent.toFixed(1)}%` : '—', color: plan.estimated_roi_percent >= 0 ? 'text-success' : 'text-danger' },
                { label: 'Cost / Head', value: plan.estimated_cost_per_head != null ? `$${plan.estimated_cost_per_head.toFixed(0)}` : '—', color: 'text-warning' },
                { label: 'Target Grade', value: plan.target_grade || '—', color: 'text-primary' },
              ].map(k => (
                <div key={k.label} className="bg-card border border-border rounded-xl p-4 text-center">
                  <div className={`font-bebas text-2xl ${k.color}`}>{k.value}</div>
                  <div className="text-xs text-muted-foreground">{k.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Executive Summary */}
          {plan.summary && (
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-bebas text-primary text-base">EXECUTIVE SUMMARY</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{plan.summary}</p>
            </div>
          )}

          {/* Collapsible sections */}
          <div className="space-y-3">
            {plan.ration_program && planType !== 'vaccination' && (
              <PlanSection
                title="🌾 FEED RATION PROGRAM"
                icon={Wheat}
                color="bg-amber-500/5 border-amber-500/20 text-amber-200"
                content={plan.ration_program}
                defaultOpen={true}
              />
            )}
            {plan.vaccination_schedule && planType !== 'ration' && (
              <PlanSection
                title="💉 VACCINATION & HEALTH SCHEDULE"
                icon={Syringe}
                color="bg-success/5 border-success/20 text-success"
                content={plan.vaccination_schedule}
                defaultOpen={planType === 'vaccination'}
              />
            )}
            {plan.economic_projection && (
              <PlanSection
                title="📊 ECONOMIC PROJECTION"
                icon={TrendingUp}
                color="bg-blue-500/5 border-blue-500/20 text-blue-300"
                content={plan.economic_projection}
                defaultOpen={false}
              />
            )}
            {plan.ai_recommendations && (
              <PlanSection
                title="⚡ AI RECOMMENDATIONS"
                icon={Sparkles}
                color="bg-primary/5 border-primary/20 text-primary"
                content={plan.ai_recommendations}
                defaultOpen={false}
              />
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center pt-2">
            {plan._fallback
              ? '⚡ Data-driven analysis generated from your actual records (AI unavailable). Validate with your nutritionist and veterinarian.'
              : 'Generated by AI using live market data, lot performance, and feed commodity costs. Always validate with your nutritionist and veterinarian.'}
          </p>
        </div>
      )}
    </div>
  );
}