import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import SectionHeader from '@/components/SectionHeader';
import { Sparkles, Wheat, Syringe, RefreshCw, ChevronDown, ChevronRight, TrendingUp, Save, FolderOpen, Clock, Plus, X, CloudSun } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const PLAN_TYPES = [
  { value: 'full', label: 'Full Program (Ration + Vaccination)', icon: Sparkles },
  { value: 'ration', label: 'Feed Ration Only', icon: Wheat },
  { value: 'vaccination', label: 'Vaccination Schedule Only', icon: Syringe },
];

const YARD_ADDRESS = '17158 E CR 49, Shattuck, OK 73858';
const YARD_LAT = 36.2687;
const YARD_LON = -99.8773;

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
  const queryClient = useQueryClient();
  const [selectedLot, setSelectedLot] = useState('');
  const [planType, setPlanType] = useState('full');
  const [focus, setFocus] = useState('balanced');
  const [daysOnFeed, setDaysOnFeed] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [environment, setEnvironment] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [showSavedPlans, setShowSavedPlans] = useState(false);
  const [currentSavedPlanId, setCurrentSavedPlanId] = useState(null);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [intakeDate, setIntakeDate] = useState('');
  const [purchasePricePerUnit, setPurchasePricePerUnit] = useState('');
  const [purchasePriceUnit, setPurchasePriceUnit] = useState('cwt');
  const [ageAtEntryDays, setAgeAtEntryDays] = useState('');

  const { data: lots = [] } = useQuery({
    queryKey: ['activeLots'],
    queryFn: () => base44.entities.CattleLot.filter({ status: 'active' }, '-purchase_date', 200),
  });

  const { data: savedPlans = [] } = useQuery({
    queryKey: ['savedFeedPlans'],
    queryFn: () => base44.entities.SavedFeedPlan.list('-created_date', 50),
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

  // Normalize purchase price to $/cwt for calculations
  const getPurchasePriceCwt = (buyWeight) => {
    const p = parseFloat(purchasePricePerUnit) || (lot?.purchase_price) || 150;
    if (purchasePriceUnit === 'cwt') return p;
    if (purchasePriceUnit === 'lb') return p * 100;
    if (purchasePriceUnit === 'head') return buyWeight > 0 ? (p / buyWeight) * 100 : 150;
    return p;
  };

  // Compute date-based projections
  const computeDateProjections = (dof) => {
    const intake = intakeDate || lot?.purchase_date || '';
    const ageEntry = parseInt(ageAtEntryDays) || null;

    let expectedOutDate = null;
    if (intake && dof) {
      const d = new Date(intake);
      d.setDate(d.getDate() + dof);
      expectedOutDate = d.toISOString().split('T')[0];
    }

    let maxDofTo426 = null;
    let breakevenDaysNote = null;
    if (ageEntry !== null) {
      maxDofTo426 = Math.max(0, 426 - ageEntry);
      breakevenDaysNote = maxDofTo426;
    } else if (intake) {
      // Estimate age from purchase_date if no age provided (Holstein calves ~60 days at arrival typical)
      maxDofTo426 = null;
    }

    return { expectedOutDate, maxDofTo426, intake };
  };

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

    const weatherInfo = weather ? `
LIVE WEATHER — ${YARD_ADDRESS} (fetched at plan generation):
- Temperature: ${weather.temp_f}°F (feels like ${weather.feels_like_f}°F)
- Humidity: ${weather.humidity}%
- Wind: ${weather.wind_mph} mph, gusts to ${weather.wind_gust_mph} mph
- Precipitation today: ${weather.precip_in}"
- 7-Day Forecast: High ${weather.week_high}°F / Low ${weather.week_low}°F | Total rain: ${weather.week_precip}" | Max wind: ${weather.week_max_wind} mph
- Weather adjustments needed: ${getWeatherAdjustments(weather)}
` : `LOCATION: ${YARD_ADDRESS} — Shattuck, OK (Ellis County, Southern Great Plains). Semi-arid climate, hot summers (frequent 100°F+), cold winters, high wind prone, limited shade typical.\n`;

    const envInfo = environment ? `\nENVIRONMENT / NOTES: ${environment}` : '';
    const extra = additionalContext ? `\nADDITIONAL CONTEXT: ${additionalContext}` : '';

    return `You are a world-class livestock nutritionist and cattle herd health veterinarian with deep expertise in beef production economics. 

Generate a comprehensive, highly specific ${planType === 'full' ? 'FEED RATION AND VACCINATION SCHEDULE' : planType === 'ration' ? 'FEED RATION PROGRAM' : 'VACCINATION AND HEALTH SCHEDULE'} optimized for: ${FOCUS.find(f => f.value === focus)?.label.toUpperCase()}.

${lotInfo}
${marketInfo}
${feedInfo}
${healthInfo}
${perfHistory}
${weatherInfo}
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

  const generateFallbackPlan = (w = weather) => {
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
    const purchasePriceCwt = getPurchasePriceCwt(buyWeight);
    const buyPricePerHead = purchasePriceCwt / 100 * buyWeight;
    const totalCostPerHead = buyPricePerHead + feedCost + yardageCost + healthCostHd + 35;

    // Date / age projections
    const { expectedOutDate, maxDofTo426 } = computeDateProjections(dof);
    const ageEntry = parseInt(ageAtEntryDays) || null;
    const ageAtSale = ageEntry !== null ? ageEntry + dof : null;
    const exceeds426 = ageAtSale !== null && ageAtSale > 426;

    // 426-day age breakeven: project weight and cost at exactly 426 days
    let breakeven426 = null;
    let weightAt426 = null;
    if (ageEntry !== null) {
      const dofTo426 = Math.max(0, 426 - ageEntry);
      const avgADG = gainLbs > 0 ? gainLbs / dof : 2.8;
      weightAt426 = Math.round(buyWeight + avgADG * dofTo426);
      const feedCost426 = Math.max(0, (weightAt426 - buyWeight)) * cog;
      const yardage426 = yardage * dofTo426;
      const totalCost426 = buyPricePerHead + feedCost426 + yardage426 + healthCostHd + 35;
      breakeven426 = weightAt426 > 0 ? parseFloat((totalCost426 / weightAt426 * 100).toFixed(2)) : null;
    }
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

    const weatherSummary = w ? `
CURRENT CONDITIONS — ${YARD_ADDRESS}:
• Temperature: ${w.temp_f}°F (feels like ${w.feels_like_f}°F) | Humidity: ${w.humidity}%
• Wind: ${w.wind_mph} mph (gusts to ${w.wind_gust_mph} mph) | Precip today: ${w.precip_in}"
• 7-Day Forecast: High ${w.week_high}°F / Low ${w.week_low}°F | Rain: ${w.week_precip}" | Max Wind: ${w.week_max_wind} mph

WEATHER-BASED ADJUSTMENTS:
${getWeatherAdjustments(w)}
` : `LOCATION: ${YARD_ADDRESS} (Shattuck, OK — Southern Plains, semi-arid, hot summers, cold winters)\n`;

    const rationProgram = `DATA-DRIVEN RATION PLAN
${l ? `Lot: ${l.lot_id || l.cattle_class} | ${l.head_count} hd | ${buyWeight} lbs → ${sellWeight} lbs | Stage: ${l.stage}` : 'General program — no specific lot selected'}
${weatherSummary}
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

PURCHASE DETAILS:
• Intake date:           ${intakeDate || l?.purchase_date || 'Not set'}
• Buy weight:            ${buyWeight} lbs/hd
• Purchase price:        $${purchasePriceCwt.toFixed(2)}/cwt ($${buyPricePerHead.toFixed(0)}/hd)
${ageEntry !== null ? `• Age at entry:          ${ageEntry} days old` : ''}

COST BREAKDOWN:
• Purchase cost:         $${buyPricePerHead.toFixed(0)}/hd
• Feed cost:             $${feedCost.toFixed(0)}/hd  (${gainLbs} lb gain @ $${cog}/lb COG)
• Yardage:               $${yardageCost.toFixed(0)}/hd  ($${yardage}/hd/day × ${dof} days)
• Health/meds:           $${healthCostHd.toFixed(0)}/hd
• Freight/misc:          $35/hd (est.)
─────────────────────────────────────────
TOTAL COST:              $${totalCostPerHead.toFixed(0)}/hd

TIMELINE:
• Days on feed:          ${dof} days
• Expected out date:     ${expectedOutDate || 'N/A (set intake date)'}
${ageAtSale !== null ? `• Projected age at sale: ${ageAtSale} days${exceeds426 ? ' ⚠ EXCEEDS 426-DAY LIMIT' : ' ✓ Within 426-day limit'}` : ''}
${maxDofTo426 !== null ? `• Max DOF to stay ≤426:  ${maxDofTo426} days` : ''}

${breakeven426 !== null ? `426-DAY AGE BREAKEVEN ANALYSIS:
• Weight at 426 days:    ${weightAt426} lbs/hd (est.)
• Breakeven price:       $${breakeven426}/cwt to recover all costs
• Current LC futures:    $${lc}/cwt — ${lc >= breakeven426 ? '✓ ABOVE breakeven' : '⚠ BELOW breakeven at $' + (breakeven426 - lc).toFixed(2) + '/cwt deficit'}
${l?.head_count ? `• Breakeven lot total:   $${(breakeven426 / 100 * weightAt426 * l.head_count).toFixed(0)} for ${l.head_count} hd` : ''}
─────────────────────────────────────────
` : ''}
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
Location: ${YARD_ADDRESS}
${w ? `Current Weather: ${w.temp_f}°F | Wind ${w.wind_mph} mph | Humidity ${w.humidity}% | 7-Day High: ${w.week_high}°F` : ''}

WEATHER MANAGEMENT PRIORITIES:
${getWeatherAdjustments(w)}

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
      summary: `${l ? `Lot ${l.lot_id || l.cattle_class} (${l.head_count} hd)` : 'General program'}: Estimated ${roi.toFixed(1)}% ROI with $${profitPerHead.toFixed(0)}/hd projected profit over ${dof} days on feed. Total cost: $${totalCostPerHead.toFixed(0)}/hd. Buy: $${purchasePriceCwt.toFixed(2)}/cwt. Sell target: ${sellWeight} lbs @ $${lc}/cwt.${expectedOutDate ? ' Est. out: ' + expectedOutDate + '.' : ''}${breakeven426 !== null ? ' 426-day BE: $' + breakeven426 + '/cwt.' : ''} Grade target: ${targetGrade}.`,
      estimated_profit_per_head: Math.round((revenuePerHead * 0.97) - totalCostPerHead),
      estimated_roi_percent: parseFloat(roi.toFixed(1)),
      estimated_cost_per_head: Math.round(totalCostPerHead),
      target_grade: targetGrade,
      // Date / age fields passed back for saving
      _expectedOutDate: expectedOutDate,
      _maxDofTo426: maxDofTo426,
      _breakeven426: breakeven426,
      _weightAt426: weightAt426,
      _ageAtEntry: ageEntry,
    };
  };

  const savePlan = async (planData, isAi = false, version = 1) => {
    const l = lots.find(lo => lo.id === selectedLot);

    const record = {
      lot_id: selectedLot || '',
      lot_label: l ? `${l.lot_id || l.cattle_class} — ${l.head_count} hd @ ${l.current_weight || l.purchase_weight} lbs` : 'General Program',
      plan_type: planType,
      focus,
      intake_date: intakeDate || l?.purchase_date || undefined,
      purchase_price_per_unit: purchasePricePerUnit ? Number(purchasePricePerUnit) : undefined,
      purchase_price_unit: purchasePriceUnit,
      days_on_feed: daysOnFeed ? Number(daysOnFeed) : undefined,
      target_weight: targetWeight ? Number(targetWeight) : undefined,
      expected_out_date: planData._expectedOutDate || undefined,
      age_at_entry_days: planData._ageAtEntry != null ? planData._ageAtEntry : undefined,
      max_dof_to_426: planData._maxDofTo426 != null ? planData._maxDofTo426 : undefined,
      breakeven_at_426_days: planData._breakeven426 != null ? planData._breakeven426 : undefined,
      breakeven_weight_at_426: planData._weightAt426 != null ? planData._weightAt426 : undefined,
      environment,
      additional_context: additionalContext,
      ration_program: planData.ration_program || '',
      vaccination_schedule: planData.vaccination_schedule || '',
      economic_projection: planData.economic_projection || '',
      ai_recommendations: planData.ai_recommendations || '',
      summary: planData.summary || '',
      estimated_profit_per_head: planData.estimated_profit_per_head,
      estimated_roi_percent: planData.estimated_roi_percent,
      estimated_cost_per_head: planData.estimated_cost_per_head,
      target_grade: planData.target_grade || '',
      is_ai_generated: isAi,
      version,
      generated_by: user?.email || '',
    };

    const saved = await base44.entities.SavedFeedPlan.create(record);
    queryClient.invalidateQueries({ queryKey: ['savedFeedPlans'] });
    return saved.id;
  };

  const loadSavedPlan = (saved) => {
    setSelectedLot(saved.lot_id || '');
    setPlanType(saved.plan_type || 'full');
    setFocus(saved.focus || 'balanced');
    setIntakeDate(saved.intake_date || '');
    setPurchasePricePerUnit(saved.purchase_price_per_unit ? String(saved.purchase_price_per_unit) : '');
    setPurchasePriceUnit(saved.purchase_price_unit || 'cwt');
    setAgeAtEntryDays(saved.age_at_entry_days ? String(saved.age_at_entry_days) : '');
    setDaysOnFeed(saved.days_on_feed ? String(saved.days_on_feed) : '');
    setTargetWeight(saved.target_weight ? String(saved.target_weight) : '');
    setEnvironment(saved.environment || '');
    setAdditionalContext(saved.additional_context || '');
    setPlan({
      ration_program: saved.ration_program,
      vaccination_schedule: saved.vaccination_schedule,
      economic_projection: saved.economic_projection,
      ai_recommendations: saved.ai_recommendations,
      summary: saved.summary,
      estimated_profit_per_head: saved.estimated_profit_per_head,
      estimated_roi_percent: saved.estimated_roi_percent,
      estimated_cost_per_head: saved.estimated_cost_per_head,
      target_grade: saved.target_grade,
      _fallback: !saved.is_ai_generated,
    });
    setCurrentSavedPlanId(saved.id);
    setShowSavedPlans(false);
    toast.success(`Loaded: ${saved.lot_label} v${saved.version}`);
  };

  const fetchWeather = async () => {
    setWeatherLoading(true);
    try {
      // Open-Meteo free API — no key required
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${YARD_LAT}&longitude=${YARD_LON}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,wind_gusts_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&forecast_days=7&timezone=America%2FChicago`;
      const res = await fetch(url);
      const data = await res.json();
      const c = data.current;
      const d = data.daily;
      const weatherObj = {
        temp_f: c.temperature_2m,
        feels_like_f: c.apparent_temperature,
        humidity: c.relative_humidity_2m,
        wind_mph: c.wind_speed_10m,
        wind_gust_mph: c.wind_gusts_10m,
        precip_in: c.precipitation,
        weather_code: c.weather_code,
        week_high: Math.max(...(d.temperature_2m_max || [])),
        week_low: Math.min(...(d.temperature_2m_min || [])),
        week_precip: (d.precipitation_sum || []).reduce((a, b) => a + b, 0).toFixed(2),
        week_max_wind: Math.max(...(d.wind_speed_10m_max || [])),
      };
      setWeather(weatherObj);
      return weatherObj;
    } catch (e) {
      console.error('Weather fetch failed', e);
      return null;
    } finally {
      setWeatherLoading(false);
    }
  };

  const getWeatherAdjustments = (w) => {
    if (!w) return '';
    const heatStress = w.temp_f > 90;
    const severeHeat = w.temp_f > 100;
    const coldStress = w.temp_f < 32;
    const highWind = w.wind_mph > 25 || w.wind_gust_mph > 40;
    const wetConditions = w.precip_in > 0.25 || parseFloat(w.week_precip) > 1.5;

    const adjustments = [];
    if (severeHeat) adjustments.push('⚠ SEVERE HEAT ALERT: Reduce feeding to cooler hours (evening/night), increase electrolytes, ensure shade and water access — reduce energy density 5–8% to prevent acidosis risk');
    else if (heatStress) adjustments.push('⚠ HEAT STRESS: Shift feed delivery to early morning and evening, increase water availability, add potassium bicarbonate buffer, monitor bunk management closely');
    if (coldStress) adjustments.push('❄ COLD CONDITIONS: Increase energy density 8–12%, add additional fat/corn, monitor water heaters to prevent freezing');
    if (highWind) adjustments.push(`⚠ HIGH WINDS (${w.wind_mph} mph, gusts ${w.wind_gust_mph} mph): Secure feed storage, monitor wind-chill impact on younger cattle, check pen windbreaks`);
    if (wetConditions) adjustments.push(`🌧 WET CONDITIONS: Watch for mud-related lameness and reduced DMI, raise feed racks/bunks above mud line, consider foot rot prevention protocol`);
    if (!heatStress && !coldStress && !highWind && !wetConditions) adjustments.push('✓ Favorable conditions — standard ration and bunk management protocols apply');

    return adjustments.join('\n');
  };

  const generatePlan = async () => {
    if (!selectedLot && lots.length > 0) {
      toast.error('Please select a cattle lot');
      return;
    }
    setLoading(true);
    setPlan(null);
    setCurrentSavedPlanId(null);

    // Fetch live weather for Shattuck, OK yard
    const liveWeather = await fetchWeather();

    // Fetch a fresh count of existing plans for this lot to get correct version number
    let version = 1;
    try {
      const existing = selectedLot
        ? await base44.entities.SavedFeedPlan.filter({ lot_id: selectedLot })
        : await base44.entities.SavedFeedPlan.list();
      version = (existing?.length || 0) + 1;
    } catch (_) {}

    // Generate data-driven plan instantly (pass live weather)
    const fallback = generateFallbackPlan(liveWeather);
    setPlan({ ...fallback, _fallback: true });
    setLoading(false);

    // Auto-save immediately (don't block UI on save failure)
    let savedId = null;
    try {
      savedId = await savePlan(fallback, false, version);
      setCurrentSavedPlanId(savedId);
      toast.success('Plan generated & saved');
    } catch (_) {
      toast.success('Plan generated');
    }

    // Silently try to upgrade with AI in the background
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
      if (savedId) {
        await base44.entities.SavedFeedPlan.update(savedId, { ...result, is_ai_generated: true });
        queryClient.invalidateQueries({ queryKey: ['savedFeedPlans'] });
      }
      toast.success('Plan upgraded with AI & saved');
    } catch (_) {
      // Credits exhausted or error — keep data-driven plan, already saved
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <SectionHeader
        title="AI FEED & HEALTH PLANNER"
        subtitle="AI-optimized rations, vaccination schedules, and economic projections per lot"
        badge="AI POWERED"
      />

      {/* Yard location + live weather badge */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-card border border-border rounded-xl text-xs">
        <CloudSun className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-muted-foreground font-medium">{YARD_ADDRESS}</span>
        {weatherLoading && <span className="text-muted-foreground animate-pulse">Fetching weather...</span>}
        {weather && !weatherLoading && (
          <>
            <span className="text-foreground font-semibold">{weather.temp_f}°F</span>
            <span className="text-muted-foreground">Feels {weather.feels_like_f}°F</span>
            <span className="text-muted-foreground">💨 {weather.wind_mph} mph</span>
            <span className="text-muted-foreground">💧 {weather.humidity}%</span>
            {weather.temp_f > 100 && <span className="text-danger font-semibold">⚠ SEVERE HEAT</span>}
            {weather.temp_f > 90 && weather.temp_f <= 100 && <span className="text-warning font-semibold">⚠ HEAT STRESS</span>}
            {weather.temp_f < 32 && <span className="text-blue-400 font-semibold">❄ FREEZE</span>}
            {weather.wind_mph > 25 && <span className="text-warning font-semibold">⚠ HIGH WIND</span>}
            <span className="text-muted-foreground ml-auto">7-day: {weather.week_low}–{weather.week_high}°F | Rain: {weather.week_precip}"</span>
          </>
        )}
        {!weather && !weatherLoading && (
          <span className="text-muted-foreground">Weather loads when you generate a plan</span>
        )}
      </div>

      {/* Saved Plans Toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowSavedPlans(o => !o)}
          className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground hover:bg-secondary/40 transition-colors"
        >
          <FolderOpen className="w-4 h-4 text-primary" />
          Saved Plans ({savedPlans.length})
          {showSavedPlans ? <X className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
        </button>
        {plan && (
          <button
            onClick={() => { setPlan(null); setCurrentSavedPlanId(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-lg text-sm text-primary hover:bg-primary/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Generate New Plan
          </button>
        )}
      </div>

      {/* Saved Plans Drawer */}
      {showSavedPlans && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-2 max-h-80 overflow-y-auto">
          {savedPlans.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No saved plans yet. Generate a plan to auto-save it.</p>
          ) : (
            savedPlans.map(sp => (
              <button
                key={sp.id}
                onClick={() => loadSavedPlan(sp)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-left hover:bg-secondary/40 transition-colors ${currentSavedPlanId === sp.id ? 'border-primary/40 bg-primary/5' : 'border-border'}`}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{sp.lot_label || 'General Program'}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span>v{sp.version}</span>
                    <span>·</span>
                    <span className="capitalize">{sp.focus}</span>
                    <span>·</span>
                    {sp.is_ai_generated
                      ? <span className="text-primary">AI</span>
                      : <span className="text-amber-400">Data-driven</span>
                    }
                    {sp.estimated_profit_per_head != null && (
                      <><span>·</span><span className={sp.estimated_profit_per_head >= 0 ? 'text-success' : 'text-danger'}>${sp.estimated_profit_per_head}/hd</span></>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {sp.created_date ? format(new Date(sp.created_date), 'MM/dd HH:mm') : '—'}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      )}

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

          {/* Intake Date */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Intake Date</label>
            <input type="date" className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
              value={intakeDate} onChange={e => setIntakeDate(e.target.value)} />
          </div>

          {/* Purchase Price */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Purchase Price</label>
            <div className="flex gap-2">
              <input type="number" placeholder="e.g. 150" step="0.01" className="flex-1 bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                value={purchasePricePerUnit} onChange={e => setPurchasePricePerUnit(e.target.value)} />
              <select className="bg-input border border-border rounded-md px-2 py-2 text-sm text-foreground"
                value={purchasePriceUnit} onChange={e => setPurchasePriceUnit(e.target.value)}>
                <option value="cwt">$/cwt</option>
                <option value="lb">$/lb</option>
                <option value="head">$/hd</option>
              </select>
            </div>
          </div>

          {/* Age at Entry */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Age at Entry (days) <span className="text-primary">— enables 426-day BE</span></label>
            <input type="number" placeholder="e.g. 100" className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
              value={ageAtEntryDays} onChange={e => setAgeAtEntryDays(e.target.value)} />
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

        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={generatePlan}
            disabled={loading}
            className="flex items-center gap-3 px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bebas text-lg tracking-wide hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {loading ? 'GENERATING...' : plan ? 'GENERATE NEW PLAN' : 'GENERATE AI PLAN'}
          </button>
          {currentSavedPlanId && !loading && (
            <div className="flex items-center gap-1.5 text-xs text-success">
              <Save className="w-3.5 h-3.5" />
              Auto-saved
            </div>
          )}
        </div>
        {loading && (
          <p className="text-xs text-muted-foreground">Generating plan from your data instantly, then upgrading with AI...</p>
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

          {/* Date & 426-day breakeven banner */}
          {(plan._expectedOutDate || plan._breakeven426 != null) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {plan._expectedOutDate && (
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <div className="font-bebas text-xl text-primary">{plan._expectedOutDate}</div>
                  <div className="text-xs text-muted-foreground">Expected Out Date</div>
                </div>
              )}
              {plan._maxDofTo426 != null && (
                <div className={`bg-card border rounded-xl p-4 text-center ${plan._maxDofTo426 < (parseInt(daysOnFeed) || 0) ? 'border-danger/40' : 'border-border'}`}>
                  <div className={`font-bebas text-xl ${plan._maxDofTo426 < (parseInt(daysOnFeed) || 0) ? 'text-danger' : 'text-success'}`}>{plan._maxDofTo426} days</div>
                  <div className="text-xs text-muted-foreground">Max DOF to 426-day limit</div>
                </div>
              )}
              {plan._weightAt426 != null && (
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <div className="font-bebas text-xl text-amber-400">{plan._weightAt426} lbs</div>
                  <div className="text-xs text-muted-foreground">Est. Weight at 426 Days</div>
                </div>
              )}
              {plan._breakeven426 != null && (
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <div className="font-bebas text-xl text-warning">${plan._breakeven426}/cwt</div>
                  <div className="text-xs text-muted-foreground">Breakeven at 426 Days</div>
                </div>
              )}
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