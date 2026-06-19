import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import SectionHeader from '@/components/SectionHeader';
import { Sparkles, Wheat, Syringe, RefreshCw, ChevronDown, ChevronRight, TrendingUp, Save, FolderOpen, Clock, Plus, X, CloudSun, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const PLAN_TYPES = [
  { value: 'full', label: 'Full Program (Ration + Vaccination)', icon: Sparkles },
  { value: 'ration', label: 'Feed Ration Only', icon: Wheat },
  { value: 'vaccination', label: 'Vaccination Schedule Only', icon: Syringe },
];

import { BREED_TYPES, SEX_OPTIONS, getCattleLabel, isDairy, isBeefDairy, isFullBeef, getUsdaLimit as getUsdaLimitFromConfig, getTargetGrade, getPerformance } from '@/lib/cattleConfig';
import { freightCostPerHead, TRUCKING_DEFAULTS } from '@/lib/truckingConfig';
import { computeBillingMiles, estimateShrink, YARD_ADDR as YARD_ADDRESS, TRUCK_MPH_MIN, TRUCK_MPH_MAX, TRUCK_MPH_AVG } from '@/lib/mileageEngine';

const FOCUS = [
  { value: 'roi',      label: 'Max ROI' },
  { value: 'grade',    label: 'Max Grade & Yield (Prime/Choice)' },
  { value: 'adr',      label: 'Max ADR / Speed to Market' },
  { value: 'cost',     label: 'Minimize Cost of Gain' },
  { value: 'balanced', label: 'Balanced (Grade + Cost + ROI)' },
];

// Yard constants
const YARD_LAT = 36.2687;
const YARD_LON = -99.8773;

function PlanSection({ title, icon: Icon, color, content, defaultOpen = false }) {
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

  // Lot / plan config
  const [selectedLot, setSelectedLot] = useState('');
  const [planType, setPlanType] = useState('full');
  const [focus, setFocus] = useState('balanced');

  // Core cattle economics inputs
  const [arrivalWt, setArrivalWt]         = useState('');
  const [shippingWt, setShippingWt]       = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [adg, setAdg]                     = useState('');
  const [cog, setCog]                     = useState('');
  const [daysOnFeed, setDaysOnFeed]       = useState('');
  const [interestRate, setInterestRate]   = useState('8');
  const [intakeDate, setIntakeDate]       = useState('');
  const [additionalContext, setAdditionalContext] = useState('');

  // Trucking inputs
  const [truckMilesOut, setTruckMilesOut] = useState('200');
  const [headOnLoad, setHeadOnLoad]       = useState('40');
  const [dieselFeed, setDieselFeed]       = useState('3.60');

  // Origin / multi-source mileage
  const [originCity, setOriginCity]       = useState('');
  const [mileageResult, setMileageResult] = useState(null);  // full result from mileageEngine
  const [calculatingMiles, setCalculatingMiles] = useState(false);
  const [shrinkOverride, setShrinkOverride] = useState('');

  // UI state
  const [loading, setLoading]             = useState(false);
  const [plan, setPlan]                   = useState(null);
  const [showSavedPlans, setShowSavedPlans] = useState(false);
  const [currentSavedPlanId, setCurrentSavedPlanId] = useState(null);
  const [weather, setWeather]             = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Data queries
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

  const lot    = lots.find(l => l.id === selectedLot);
  const market = marketInputs[0];

  // -------------------------------------------------------------------
  // Multi-source mileage engine
  // Google Maps (OSRM: 3 route alternatives) avg'd + Trucker Path estimate avg'd = billing miles
  // -------------------------------------------------------------------
  const computeTransit = async () => {
    if (!originCity.trim()) return;
    setCalculatingMiles(true);
    try {
      const result = await computeBillingMiles(originCity);
      setMileageResult(result);
      toast.success(
        `${result.originName} → Shattuck OK: ${result.finalBillingMiles} billing mi | ` +
        `ETA ${result.etaMinHrs}–${result.etaMaxHrs} hrs | ${result.shrinkPct}% shrink`
      );
    } catch (e) {
      toast.error('Mileage calculation failed. Check city/state format and try again.');
    } finally {
      setCalculatingMiles(false);
    }
  };

  // Derived from mileage result
  const transitMiles  = mileageResult?.finalBillingMiles || null;
  const effectiveShrink = shrinkOverride
    ? parseFloat(shrinkOverride)
    : (mileageResult?.shrinkPct ?? 3.0);

  const haulInMiles  = transitMiles || 300;
  const haulOutMiles = parseInt(truckMilesOut) || 200;
  const haulHeads    = parseInt(headOnLoad)    || lot?.head_count || 40;
  const haulDiesel   = parseFloat(dieselFeed)  || 3.60;

  const freightInResult  = freightCostPerHead({ miles: haulInMiles,  headCount: haulHeads, dieselPrice: haulDiesel });
  const freightOutResult = freightCostPerHead({ miles: haulOutMiles, headCount: haulHeads, dieselPrice: haulDiesel });
  const autoFreightIn    = freightInResult.costPerHead;
  const autoFreightOut   = freightOutResult.costPerHead;

  // -------------------------------------------------------------------
  // Central economics engine
  // -------------------------------------------------------------------
  const computeEconomics = () => {
    const buyWt   = parseFloat(arrivalWt)    || lot?.current_weight || lot?.purchase_weight || 700;
    const sellWt  = parseFloat(shippingWt)   || lot?.target_weight  || 1300;
    const gainLbs = Math.max(sellWt - buyWt, 0);
    const adgVal  = parseFloat(adg)          || 2.8;
    const dof     = parseInt(daysOnFeed)     || (gainLbs > 0 ? Math.round(gainLbs / adgVal) : 180);
    const ppCwt   = parseFloat(purchasePrice)|| lot?.purchase_price  || 150;
    const ppPerHead = ppCwt / 100 * buyWt;
    const cogVal  = parseFloat(cog)          || lot?.cog             || 0.90;
    const feedCost    = gainLbs * cogVal;
    const yardage     = lot?.yardage || 0.45;
    const yardageCost = yardage * dof;
    const healthCost  = healthProtocols.length > 0
      ? healthProtocols.reduce((s, p) => s + (p.cost_per_head || 0), 0)
      : 55;
    const truckIn  = autoFreightIn;
    const truckOut = autoFreightOut;
    const rate     = (parseFloat(interestRate) / 100) || 0.08;
    const interestCost = (ppPerHead + truckIn) * rate * (dof / 365);
    const totalCost = ppPerHead + feedCost + yardageCost + healthCost + truckIn + truckOut + interestCost;

    const lc = market?.lc_futures || 185;
    const fc = market?.gf_futures  || 245;
    const shrink = effectiveShrink / 100;
    const netSellWt = sellWt * (1 - shrink);
    const grossRev  = netSellWt * (lc / 100);
    const profitPerHead = grossRev - totalCost;
    const roi = totalCost > 0 ? (profitPerHead / totalCost * 100) : 0;
    const breakevenCwt = totalCost / netSellWt * 100;

    // USDA compliance — weight-based (no age-in-days required)
    const usdaLimit  = getUsdaLimitFromConfig(lot?.breed_type, focus);
    const targetGrade = getTargetGrade(lot?.breed_type);
    const intake     = intakeDate || lot?.purchase_date || '';
    let expectedOutDate = null;
    if (intake && dof) {
      const d = new Date(intake); d.setDate(d.getDate() + dof);
      expectedOutDate = d.toISOString().split('T')[0];
    }
    // Weight-based grade compliance check: does the target sell weight fit the grade's expected range?
    const gradeMaxWt = isDairy(lot?.breed_type) ? 1350 : isBeefDairy(lot?.breed_type) ? 1400 : 1500;
    const weightCompliant = sellWt <= gradeMaxWt;

    const corn = market?.corn_price || 4.50;
    const headCount = lot?.head_count || null;

    return {
      buyWt, sellWt, gainLbs, dof, adgVal, cogVal, ppCwt, ppPerHead,
      feedCost, yardageCost, healthCost, truckIn, truckOut, interestCost,
      totalCost, lc, fc, shrink: effectiveShrink, netSellWt, grossRev,
      profitPerHead, roi, breakevenCwt, usdaLimit, expectedOutDate,
      targetGrade, headCount, corn, yardage, weightCompliant, gradeMaxWt,
    };
  };

  // -------------------------------------------------------------------
  // Build AI prompt
  // -------------------------------------------------------------------
  const buildPrompt = (econ) => {
    const l   = lot;
    const mkt = market;
    const usdaLimit = getUsdaLimitFromConfig(l?.breed_type, focus);
    const mr = mileageResult;
    const transitInfo = mr
      ? `Origin: ${mr.originName} → ${YARD_ADDRESS}\n` +
        `  Google Maps (${mr.googleRoutes.length} routes): ${mr.googleRoutes.join(' / ')} mi → avg ${mr.googleAvgMiles} mi\n` +
        `  Trucker Path estimate: ${mr.truckerPathMiles} mi\n` +
        `  FINAL BILLING MILES: ${mr.finalBillingMiles} mi (avg of both sources)\n` +
        `  ETA: ${mr.etaMinHrs}–${mr.etaMaxHrs} hrs @ ${TRUCK_MPH_MIN}–${TRUCK_MPH_MAX} mph\n` +
        `  Transit shrink: ${econ.shrink}% | Stress: ${mr.stressLevel}`
      : originCity ? `Origin: ${originCity} (miles not yet calculated)` : 'Origin not specified';

    return `You are a world-class livestock nutritionist and feedlot economist. Use EXACT economics inputs — do not override user-entered values.

USDA BQA (weight-based compliance): Select ≤30 mo | Choice/Prime ≤42 mo | Target grade: ${usdaLimit.grade} | Target sell weight: ${econ.sellWt} lbs${econ.weightCompliant ? ' ✓ Within grade weight range' : ` ⚠ Exceeds recommended ${econ.gradeMaxWt} lbs for this breed/grade`}

CATTLE LOT: ${l ? `${getCattleLabel(l?.breed_type, l?.sex)} | ${l.head_count} hd | Stage: ${l.stage} | Yard: ${l.yard}, Pen: ${l.pen}` : 'No specific lot'}
BREED: ${l?.breed_type ? `${BREED_TYPES.find(b => b.value === l.breed_type)?.label || l.breed_type}` : 'Not specified'} | SEX: ${l?.sex ? `${SEX_OPTIONS.find(s => s.value === l.sex)?.label || l.sex}` : 'Not specified'}
${l?.breed_type ? `Dairy Influence: ${isDairy(l.breed_type) ? 'Full dairy (100%)' : isBeefDairy(l.breed_type) ? 'Beef × Dairy cross' : 'Full beef'} | Dressing: ${(getPerformance(l.breed_type, l.sex || 'steer').dressingPct * 100).toFixed(1)}% | Grid Adj: ${getPerformance(l.breed_type, l.sex || 'steer').gridAdj >= 0 ? '+' : ''}${getPerformance(l.breed_type, l.sex || 'steer').gridAdj}` : ''}

TRANSIT INFO (critical for arrival protocol & expected shrink):
${transitInfo}
- NOTE: Adjust arrival processing protocol based on transit stress — longer hauls require more aggressive receiving protocol (electrolytes, light roughage, BRD monitoring window extended)

ECONOMICS INPUTS:
- Arrival Wt: ${econ.buyWt} lbs/hd | Shipping Wt: ${econ.sellWt} lbs/hd | Gain: ${econ.gainLbs} lbs
- Purchase Price: $${econ.ppCwt}/cwt ($${econ.ppPerHead.toFixed(0)}/hd)
- ADG: ${econ.adgVal} lbs/day | COG: $${econ.cogVal}/lb | DOF: ${econ.dof} days
- Interest: ${interestRate}%/yr | Freight In: $${econ.truckIn.toFixed(2)}/hd (${haulInMiles} billing mi @ $${freightInResult.ratePerMile.toFixed(2)}/mi, driver $${freightInResult.driverPayPerLoad.toFixed(0)}/load) | Freight Out: $${econ.truckOut.toFixed(2)}/hd (${haulOutMiles} mi)
- Pencil Shrink at Sale: ${econ.shrink}%
- Total Cost: $${econ.totalCost.toFixed(0)}/hd | Breakeven: $${econ.breakevenCwt.toFixed(2)}/cwt

LIVE MARKET (${mkt?.date || 'latest'}):
- LC Futures: $${econ.lc}/cwt (sell ref) | FC Futures: $${econ.fc}/cwt (buy ref)
- Choice Cutout: $${mkt?.choice_cutout || '—'} | Select: $${mkt?.select_cutout || '—'} | Prime: $${mkt?.prime_cutout || '—'}
- Corn: $${econ.corn}/bu | SBM: $${mkt?.sbm_price || '—'}/ton
- Projected profit: $${econ.profitPerHead.toFixed(0)}/hd (${econ.roi.toFixed(1)}% ROI)

WEATHER — ${YARD_ADDRESS}: ${weather ? `${weather.temp_f}°F (feels ${weather.feels_like_f}°F) | Wind ${weather.wind_mph} mph | ${getWeatherAdjustments(weather)}` : 'Southern Great Plains, semi-arid'}
${feedProtocols.length > 0 ? `\nFEED COMMODITIES:\n${feedProtocols.map(f => `- ${f.commodity_name}: $${f.cost_per_ton}/ton, TDN ${f.tdn_percent}%, CP ${f.cp_percent}%, ${f.daily_intake_head} lbs/hd/day`).join('\n')}` : ''}
${healthProtocols.length > 0 ? `\nHEALTH PROTOCOLS:\n${healthProtocols.map(p => `- ${p.protocol_name} (${p.cattle_class}): ${p.action} @ ${p.timing}, ${p.product}, ${p.dosage}, $${p.cost_per_head}/hd`).join('\n')}` : ''}
${healthEvents.length > 0 ? `\nHEALTH HISTORY:\n${healthEvents.slice(0, 15).map(e => `- ${e.event_date}: ${e.event_type}, ${e.head_affected} hd, ${e.diagnosis || ''}`).join('\n')}` : ''}
${additionalContext ? `\nNOTES: ${additionalContext}` : ''}

Generate: ${planType === 'full' ? 'FEED RATION + VACCINATION' : planType === 'ration' ? 'FEED RATION' : 'VACCINATION SCHEDULE'} optimized for: ${FOCUS.find(f => f.value === focus)?.label.toUpperCase()}

${planType !== 'vaccination' ? `## 🌾 RATION PROGRAM\n- Phase-by-phase: DMI, ingredients %, TDN%, CP%, ADG, cost/hd/day\n- Additives (ionophores, implants, buffers, minerals)\n- Arrival/receiving phase adjusted for transit distance (${transitMiles || '?'} mi)\n- Bunk management, water requirements\n` : ''}${planType !== 'ration' ? `## 💉 VACCINATION & HEALTH PROTOCOL\n- Arrival protocol adjusted for haul distance/stress level\n- Full BQA timeline: Day 0 through pre-ship\n- Specific products, dosages, withdrawal times\n- Estimated total health cost/hd\n` : ''}## 📊 ECONOMIC PROJECTION\nUse EXACT values: Buy $${econ.ppCwt}/cwt, COG $${econ.cogVal}/lb, DOF ${econ.dof}, LC $${econ.lc}/cwt, shrink ${econ.shrink}%\n- Full cost breakdown | Net profit/hd | Total lot (${lot?.head_count || '?'} hd) | ROI | Breakeven\n- Sensitivity: profit if LC ±$10/cwt\n\n## ⚡ AI RECOMMENDATIONS\n- Top 3 actions given LC $${econ.lc}/cwt vs BE $${econ.breakevenCwt.toFixed(2)}/cwt\n- Origin-specific health risks (transit stress, regional disease pressure from ${originCity || 'unknown origin'})\n- Optimal marketing window based on FC/LC spread`;
  };

  // -------------------------------------------------------------------
  // Data-driven fallback plan
  // -------------------------------------------------------------------
  const generateFallbackPlan = (econ, w = weather) => {
    const l = lot;
    const mkt = market;
    const {
      buyWt, sellWt, gainLbs, dof, adgVal, cogVal, ppCwt, ppPerHead,
      feedCost, yardageCost, healthCost, truckIn, truckOut, interestCost,
      totalCost, lc, fc, shrink, netSellWt, grossRev, profitPerHead, roi,
      breakevenCwt, usdaLimit, expectedOutDate,
      targetGrade, headCount, corn, yardage, weightCompliant, gradeMaxWt,
    } = econ;

    const dmiLbs = Math.round(buyWt * 0.025);
    const mr = mileageResult;

    // Multi-source transit summary
    const transitBlock = mr
      ? `TRANSIT: ${mr.originName} → ${YARD_ADDRESS}\n` +
        `• Google Maps routes: ${mr.googleRoutes.join(' / ')} mi → avg ${mr.googleAvgMiles} mi\n` +
        `• Trucker Path estimate: ${mr.truckerPathMiles} mi\n` +
        `• FINAL BILLING MILES: ${mr.finalBillingMiles} mi (avg of both sources)\n` +
        `• ETA: ${mr.etaMinHrs}–${mr.etaMaxHrs} hrs @ ${TRUCK_MPH_MIN}–${TRUCK_MPH_MAX} mph avg\n` +
        `• Shrink: ${shrink}%${shrinkOverride ? ' (manual override)' : ' (auto from mileage)'} | Stress: ${mr.stressLevel}`
      : originCity
        ? `ORIGIN: ${originCity} (click Calculate to get multi-source billing miles)`
        : `ORIGIN: Not specified — using standard receiving protocol`;

    const feedList = feedProtocols.length > 0
      ? feedProtocols.map(f => `• ${f.commodity_name}: $${f.cost_per_ton}/ton | TDN ${f.tdn_percent || '—'}% | CP ${f.cp_percent || '—'}% | ${f.daily_intake_head || '—'} lbs/hd/day`).join('\n')
      : `• Corn (dry-rolled): ~$${(corn * 8.5).toFixed(0)}/ton | TDN 88% | CP 9%\n• Alfalfa Hay: ~$220/ton | TDN 58% | CP 18%\n• Soybean Meal: ~$${mkt?.sbm_price || 340}/ton | TDN 82% | CP 47%\n• Distillers Grains: ~$150/ton | TDN 85% | CP 28%\n• Mineral/Vitamin mix: ~$600/ton`;

    const healthList = healthProtocols.length > 0
      ? healthProtocols.map(p => `• ${p.protocol_name} | ${p.cattle_class} | ${p.action} @ ${p.timing}${p.product ? ' | ' + p.product : ''}${p.cost_per_head ? ' | $' + p.cost_per_head + '/hd' : ''}`).join('\n')
      : `• Day 0: Pyramid 5+Presponse HM, 7-way Clostridial, Dectomax, Implant\n• Day 14–21: IBR-BVD boosters\n• Day 60–90: Re-implant\n• Pre-ship: Health check, withdrawal compliance\n• Est. health cost: $45–$65/hd`;

    const weatherNote = w
      ? `WEATHER: ${w.temp_f}°F (feels ${w.feels_like_f}°F) | Wind ${w.wind_mph} mph | 7-day: ${w.week_low}–${w.week_high}°F\n${getWeatherAdjustments(w)}`
      : `LOCATION: ${YARD_ADDRESS} (Southern Plains)`;

    const billingMi = mr?.finalBillingMiles || 0;
    // Receiving phase length varies by transit stress
    const receivingDays = billingMi > 600 ? 28 : billingMi > 250 ? 21 : 14;

    const rationProgram = `DATA-DRIVEN RATION PLAN
${l ? `Lot: ${l.lot_id || getCattleLabel(l.breed_type, l.sex)} | ${headCount} hd | ${buyWt} lbs → ${sellWt} lbs | ADG ${adgVal} lbs/day | ${dof} DOF` : 'General program'}

${transitBlock}
${weatherNote}

FEED COMMODITIES ON RECORD:
${feedList}

PHASE 1 — RECEIVING / STARTER (Days 1–${receivingDays})
DMI: ${Math.round(dmiLbs * 0.75)} lbs/hd/day | TDN: 68–72% | CP: 14–16%
• ${billingMi > 600 ? 'EXTENDED receiving — high-stress long haul. Electrolytes day 1–3, light hay only days 1–3, gradual concentrate introduction.' : billingMi > 250 ? 'Standard receiving — moderate transit stress. Hay/roughage emphasis first week.' : 'Short haul — normal receiving. Begin concentrate adaptation sooner.'}
• Focus: stress recovery, rumen adaptation | ADG est: 1.5–2.0 lbs/day

PHASE 2 — GROWER (Days ${receivingDays + 1}–${Math.round(dof * 0.55)})
DMI: ${dmiLbs} lbs/hd/day | TDN: 75–78% | CP: 12–13%
• Mid-grain, add distillers, Rumensin/Bovatec | ADG est: ${adgVal} lbs/day

PHASE 3 — FINISHER (Days ${Math.round(dof * 0.55) + 1}–${dof})
DMI: ${Math.round(dmiLbs * 1.1)} lbs/hd/day | TDN: 82–86% | CP: 11–12%
• High-grain (85–90%), min roughage 1–1.5% BW | ADG est: ${(adgVal * 1.1).toFixed(1)} lbs/day
• Beta-agonist consideration at Day ${dof - 28} if grid allows

TOTAL FEED COST: $${feedCost.toFixed(0)}/hd over ${dof} days @ $${cogVal}/lb COG ($${(feedCost / dof).toFixed(2)}/hd/day avg)`;

    const vaccinationSchedule = `DATA-DRIVEN HEALTH PROTOCOL
${l ? `${l.lot_id || getCattleLabel(l.breed_type, l.sex)} | ${getCattleLabel(l.breed_type, l.sex)}` : 'General BQA program'}

${transitBlock}

TRANSIT STRESS PROTOCOL ADJUSTMENT:
${billingMi > 600
  ? '⚠ HIGH STRESS HAUL (>600 mi): Extended monitoring window. Expect elevated BRD risk 7–21 days post-arrival. Watch for chronic respiratories at 30 days. Consider metaphylaxis on arrival for high-risk cattle.'
  : billingMi > 250
    ? '⚠ MODERATE HAUL (250–600 mi): Standard BRD protocol, enhanced monitoring week 1–2.'
    : billingMi > 0
      ? '✓ SHORT HAUL (<250 mi): Low transit stress. Standard receiving protocol applies.'
      : 'Origin not specified — apply moderate protocol as default.'}

PROTOCOLS ON RECORD:
${healthList}

BQA STANDARD TIMELINE:
• Day 0: Weigh, tag, process | Vaccines, dewormer, implant | Neck-triangle only
${billingMi > 600 ? '• Day 0–3: Electrolytes in water, hay only, monitor closely\n• Day 3–7: Begin concentrate introduction slowly' : ''}
• Day 14–21: Boosters | Day 60–90: Re-implant
• Day ${dof - 28}: Terminal implant — confirm 28-day withdrawal
• Pre-ship: Health inspection, compliance check

HEALTH COST: $${healthCost.toFixed(0)}/hd`;

    const econProjection = `ECONOMIC PROJECTION
${l ? `${l.lot_id || getCattleLabel(l.breed_type, l.sex)} | ${headCount} hd | Focus: ${FOCUS.find(f => f.value === focus)?.label}` : 'General estimate'}

INPUTS:
• Intake date:        ${intakeDate || l?.purchase_date || 'Not set'}
• Arrival weight:     ${buyWt} lbs/hd
• Shipping weight:    ${sellWt} lbs/hd  (${gainLbs} lbs gain)
• Purchase price:     $${ppCwt}/cwt  ($${ppPerHead.toFixed(0)}/hd)
• ADG:                ${adgVal} lbs/hd/day
• COG:                $${cogVal}/lb
• Days on feed:       ${dof} days
• Interest rate:      ${interestRate}%/yr
• Trucking in:        $${truckIn.toFixed(0)}/hd | Trucking out: $${truckOut.toFixed(0)}/hd
• Pencil shrink:      ${shrink}%
${mr ? `• Billing miles:      ${mr.finalBillingMiles} mi (Google avg ${mr.googleAvgMiles} mi / Trucker Path ${mr.truckerPathMiles} mi)\n• ETA:                ${mr.etaMinHrs}–${mr.etaMaxHrs} hrs @ ${TRUCK_MPH_MIN}–${TRUCK_MPH_MAX} mph` : ''}

COST BREAKDOWN:
• Purchase:           $${ppPerHead.toFixed(0)}/hd
• Feed cost:          $${feedCost.toFixed(0)}/hd  (${gainLbs} lbs × $${cogVal}/lb)
• Yardage:            $${yardageCost.toFixed(0)}/hd  ($${yardage}/hd/day × ${dof} days)
• Health/meds:        $${healthCost.toFixed(0)}/hd
• Trucking in:        $${truckIn.toFixed(0)}/hd
• Trucking out:       $${truckOut.toFixed(0)}/hd
• Interest:           $${interestCost.toFixed(0)}/hd  (${interestRate}% × ${dof} days)
──────────────────────────────────────
TOTAL COST:           $${totalCost.toFixed(0)}/hd

MARKET (LC/FC):
• LC Futures:         $${lc}/cwt  (sell reference)
• FC Futures:         $${fc}/cwt  (buy reference) | Basis: $${(fc - lc).toFixed(2)}/cwt
• Net sell weight:    ${netSellWt.toFixed(0)} lbs/hd  (after ${shrink}% shrink)
• Gross revenue:      $${grossRev.toFixed(0)}/hd
${headCount ? `• Total lot revenue:  $${(grossRev * headCount).toFixed(0)}  (${headCount} hd)` : ''}

TIMELINE:
• Days on feed:       ${dof} days
• Expected out date:  ${expectedOutDate || 'N/A — set intake date'}

USDA BQA (weight-based):
• Target grade:       ${targetGrade}
• Sell weight:        ${sellWt} lbs/hd ${weightCompliant ? `✓ within ${targetGrade} range` : `⚠ exceeds recommended ${gradeMaxWt} lbs for this breed/grade`}

NET PROFIT:           $${profitPerHead.toFixed(0)}/hd  ${profitPerHead >= 0 ? '✓' : '⚠ LOSS'}
ROI:                  ${roi.toFixed(1)}%
BREAKEVEN SELL:       $${breakevenCwt.toFixed(2)}/cwt  (vs LC $${lc} — ${lc >= breakevenCwt ? '✓ $' + (lc - breakevenCwt).toFixed(2) + ' margin' : '⚠ $' + (breakevenCwt - lc).toFixed(2) + ' short'})
${headCount ? `TOTAL LOT PROFIT:     $${(profitPerHead * headCount).toFixed(0)}` : ''}

GRADE TARGET: ${targetGrade}
SENSITIVITY:
• LC +$10 → $${(profitPerHead + netSellWt * 0.10).toFixed(0)}/hd
• LC -$10 → $${(profitPerHead - netSellWt * 0.10).toFixed(0)}/hd`;

    const recommendations = `DATA-DRIVEN RECOMMENDATIONS
Focus: ${FOCUS.find(f => f.value === focus)?.label}
${w ? `Weather: ${w.temp_f}°F | Wind ${w.wind_mph} mph | 7-Day High: ${w.week_high}°F` : ''}

TRANSIT / MILEAGE ANALYSIS:
${mr
  ? `• Route: ${mr.originName} → Shattuck, OK\n• Google Maps routes: ${mr.googleRoutes.join(' / ')} mi (avg ${mr.googleAvgMiles} mi)\n• Trucker Path: ${mr.truckerPathMiles} mi\n• BILLING MILES: ${mr.finalBillingMiles} mi | ETA: ${mr.etaMinHrs}–${mr.etaMaxHrs} hrs\n• Shrink: ${shrink}% | Stress: ${billingMi > 600 ? '⚠ HIGH — extended receiving protocol, BRD metaphylaxis consideration' : billingMi > 250 ? '⚠ MODERATE — standard BRD, enhanced monitoring week 1' : '✓ LOW — normal receiving protocol'}`
  : originCity
    ? `• Origin: ${originCity} (click Calculate to run multi-source mileage)`
    : '• No origin entered — standard receiving protocol applied'}

MARKET:
• LC $${lc}/cwt vs BE $${breakevenCwt.toFixed(2)}/cwt — ${lc >= breakevenCwt ? `✓ $${(lc - breakevenCwt).toFixed(2)}/cwt margin` : `⚠ $${(breakevenCwt - lc).toFixed(2)}/cwt deficit`}
• FC/LC Basis: $${(fc - lc).toFixed(2)}/cwt | COG $${cogVal}/lb

WEATHER:
${getWeatherAdjustments(w)}

TOP ACTIONS:
${lc >= breakevenCwt ? `1. ✓ Profitable at $${profitPerHead.toFixed(0)}/hd — finalize sell date targeting ${sellWt} lbs` : `1. ⚠ Below breakeven — reduce COG or wait for LC recovery`}
2. ${adgVal < 3.0 ? `⚠ ADG ${adgVal} — review implant/ration energy` : `✓ ADG ${adgVal} on target`}
3. ${interestCost > 50 ? `⚠ Interest $${interestCost.toFixed(0)}/hd — capital at risk, stay on DOF timeline` : `✓ Interest manageable at $${interestCost.toFixed(0)}/hd`}
${healthEvents.length > 0 ? `4. ⚠ ${healthEvents.length} health events on record — review protocol` : '4. ✓ No health flags for this lot'}

NOTE: Data-driven analysis. AI upgrade requires integration credits.`;

    return {
      ration_program: rationProgram,
      vaccination_schedule: vaccinationSchedule,
      economic_projection: econProjection,
      ai_recommendations: recommendations,
      summary: `${l ? `${l.lot_id || getCattleLabel(l.breed_type, l.sex)} (${headCount} hd)` : 'General'}: $${profitPerHead.toFixed(0)}/hd profit | ${roi.toFixed(1)}% ROI | ${dof} DOF | Buy $${ppCwt}/cwt → Sell ${sellWt} lbs @ LC $${lc}/cwt | BE $${breakevenCwt.toFixed(2)}/cwt${mr ? ` | ${mr.originName} → ${mr.finalBillingMiles} billing mi` : ''}.`,
      estimated_profit_per_head: Math.round(profitPerHead),
      estimated_roi_percent: parseFloat(roi.toFixed(1)),
      estimated_cost_per_head: Math.round(totalCost),
      target_grade: targetGrade,
      _expectedOutDate: expectedOutDate,
      _usdaLimit: usdaLimit,
      _weightCompliant: weightCompliant,
      _gradeMaxWt: gradeMaxWt,
      _mileageResult: mr,
    };
  };

  // -------------------------------------------------------------------
  // Save / Load
  // -------------------------------------------------------------------
  const savePlan = async (planData, isAi = false, version = 1) => {
    const l = lots.find(lo => lo.id === selectedLot);
    const record = {
      lot_id: selectedLot || '',
      lot_label: l ? `${l.lot_id || getCattleLabel(l.breed_type, l.sex)} — ${l.head_count} hd @ ${l.current_weight || l.purchase_weight} lbs` : 'General Program',
      plan_type: planType,
      focus,
      intake_date: intakeDate || l?.purchase_date || undefined,
      purchase_price_per_unit: purchasePrice ? Number(purchasePrice) : undefined,
      purchase_price_unit: 'cwt',
      days_on_feed: daysOnFeed ? Number(daysOnFeed) : undefined,
      target_weight: shippingWt ? Number(shippingWt) : undefined,
      expected_out_date: planData._expectedOutDate || undefined,
      environment: originCity ? `Origin: ${originCity}${mileageResult ? ` | ${mileageResult.finalBillingMiles} billing mi` : ''}` : '',
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
    setPurchasePrice(saved.purchase_price_per_unit ? String(saved.purchase_price_per_unit) : '');
    setDaysOnFeed(saved.days_on_feed ? String(saved.days_on_feed) : '');
    setShippingWt(saved.target_weight ? String(saved.target_weight) : '');
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

  // -------------------------------------------------------------------
  // Weather
  // -------------------------------------------------------------------
  const fetchWeather = async () => {
    setWeatherLoading(true);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${YARD_LAT}&longitude=${YARD_LON}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,wind_gusts_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&forecast_days=7&timezone=America%2FChicago`;
      const data = await fetch(url).then(r => r.json());
      const c = data.current, d = data.daily;
      const w = {
        temp_f: c.temperature_2m, feels_like_f: c.apparent_temperature,
        humidity: c.relative_humidity_2m, wind_mph: c.wind_speed_10m,
        wind_gust_mph: c.wind_gusts_10m, precip_in: c.precipitation,
        week_high: Math.max(...(d.temperature_2m_max || [])),
        week_low:  Math.min(...(d.temperature_2m_min || [])),
        week_precip: (d.precipitation_sum || []).reduce((a, b) => a + b, 0).toFixed(2),
        week_max_wind: Math.max(...(d.wind_speed_10m_max || [])),
      };
      setWeather(w);
      return w;
    } catch { return null; }
    finally { setWeatherLoading(false); }
  };

  const getWeatherAdjustments = (w) => {
    if (!w) return 'No weather data';
    const adj = [];
    if (w.temp_f > 100)      adj.push('⚠ SEVERE HEAT: Feed at night, electrolytes, reduce energy density 5–8%');
    else if (w.temp_f > 90)  adj.push('⚠ HEAT STRESS: Early morning/evening feeding, increase water, add K-buffer');
    if (w.temp_f < 32)       adj.push('❄ COLD: Increase energy density 8–12%, check water heaters');
    if (w.wind_mph > 25)     adj.push(`⚠ HIGH WINDS (${w.wind_mph} mph): Secure feed, check windbreaks`);
    if (w.precip_in > 0.25)  adj.push('🌧 WET: Watch mud/lameness, raise bunks');
    if (!adj.length)         adj.push('✓ Favorable conditions — standard protocols');
    return adj.join('\n');
  };

  // -------------------------------------------------------------------
  // Generate plan
  // -------------------------------------------------------------------
  const generatePlan = async () => {
    setLoading(true);
    setPlan(null);
    setCurrentSavedPlanId(null);

    const liveWeather = await fetchWeather();
    const econ = computeEconomics();

    let version = 1;
    try {
      const existing = selectedLot
        ? await base44.entities.SavedFeedPlan.filter({ lot_id: selectedLot })
        : await base44.entities.SavedFeedPlan.list();
      version = (existing?.length || 0) + 1;
    } catch (_) {}

    const fallback = generateFallbackPlan(econ, liveWeather);
    setPlan({ ...fallback, _fallback: true });
    setLoading(false);

    let savedId = null;
    try {
      savedId = await savePlan(fallback, false, version);
      setCurrentSavedPlanId(savedId);
      toast.success('Plan generated & saved');
    } catch (_) { toast.success('Plan generated'); }

    // Try AI upgrade
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: buildPrompt(econ),
        model: 'claude_sonnet_4_6',
        response_json_schema: {
          type: 'object',
          properties: {
            ration_program: { type: 'string' },
            vaccination_schedule: { type: 'string' },
            economic_projection: { type: 'string' },
            ai_recommendations: { type: 'string' },
            summary: { type: 'string' },
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
    } catch (_) { /* credits exhausted — keep data-driven */ }
  };

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------
  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <SectionHeader
        title="AI FEED & HEALTH PLANNER"
        subtitle="Rations, vaccinations, and economic projections driven by your inputs + live LC/FC boards"
        badge="AI POWERED"
      />

      {/* Weather bar */}
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
          <span className="text-muted-foreground">Live weather loads when you generate a plan</span>
        )}
      </div>

      {/* Live market snapshot */}
      {market && (
        <div className="flex flex-wrap gap-4 px-4 py-3 bg-card border border-border rounded-xl text-xs">
          <span className="text-primary font-medium">LIVE MARKET ({market.date}):</span>
          <span className="text-foreground font-semibold">LC ${market.lc_futures}/cwt</span>
          <span className="text-foreground font-semibold">FC ${market.gf_futures}/cwt</span>
          <span className="text-muted-foreground">Choice ${market.choice_cutout}/cwt</span>
          <span className="text-muted-foreground">Select ${market.select_cutout}/cwt</span>
          <span className="text-muted-foreground">Corn ${market.corn_price}/bu</span>
          <span className="text-muted-foreground">SBM ${market.sbm_price}/ton</span>
        </div>
      )}

      {/* Saved Plans */}
      <div className="flex items-center justify-between">
        <button onClick={() => setShowSavedPlans(o => !o)}
          className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground hover:bg-secondary/40 transition-colors">
          <FolderOpen className="w-4 h-4 text-primary" />
          Saved Plans ({savedPlans.length})
          {showSavedPlans ? <X className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
        </button>
        {plan && (
          <button onClick={() => { setPlan(null); setCurrentSavedPlanId(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-lg text-sm text-primary hover:bg-primary/20 transition-colors">
            <Plus className="w-4 h-4" /> Generate New Plan
          </button>
        )}
      </div>

      {showSavedPlans && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-2 max-h-72 overflow-y-auto">
          {savedPlans.length === 0
            ? <p className="text-sm text-muted-foreground text-center py-4">No saved plans yet.</p>
            : savedPlans.map(sp => (
              <div key={sp.id} className={`flex items-center gap-2 rounded-lg border ${currentSavedPlanId === sp.id ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
                <button onClick={() => loadSavedPlan(sp)}
                  className="flex-1 flex items-center justify-between px-4 py-3 text-left hover:bg-secondary/40 transition-colors rounded-l-lg min-w-0">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{sp.lot_label || 'General Program'}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span>v{sp.version}</span><span>·</span>
                      <span className="capitalize">{sp.focus}</span><span>·</span>
                      {sp.is_ai_generated ? <span className="text-primary">AI</span> : <span className="text-amber-400">Data-driven</span>}
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
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!confirm('Delete this saved plan?')) return;
                    await base44.entities.SavedFeedPlan.delete(sp.id);
                    queryClient.invalidateQueries({ queryKey: ['savedFeedPlans'] });
                    if (currentSavedPlanId === sp.id) { setCurrentSavedPlanId(null); setPlan(null); }
                    toast.success('Plan deleted');
                  }}
                  className="px-3 py-3 text-muted-foreground hover:text-danger transition-colors flex-shrink-0"
                  title="Delete plan"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))
          }
        </div>
      )}

      {/* Config Panel */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-6">
        <h3 className="font-bebas text-primary text-lg">CONFIGURE PLAN</h3>

        {/* Lot + Plan Type + Focus */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Cattle Lot</label>
            <select className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
              value={selectedLot} onChange={e => setSelectedLot(e.target.value)}>
              <option value="">General best-practice program (no specific lot)</option>
              {lots.map(l => (
                <option key={l.id} value={l.id}>
                  {l.lot_id || getCattleLabel(l.breed_type, l.sex)} — {l.head_count} hd @ {l.current_weight || l.purchase_weight} lbs — {l.yard} Pen {l.pen}
                </option>
              ))}
            </select>
          </div>

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
        </div>

        {/* Origin / Multi-Source Mileage Engine */}
        <div>
          <h4 className="font-bebas text-foreground text-base mb-3 flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary" /> ORIGIN & MULTI-SOURCE MILEAGE
          </h4>
          <div className="space-y-3">
            {/* Origin input */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Cattle Origin (City, State)</label>
                <input
                  placeholder="e.g. Dodge City, KS"
                  className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                  value={originCity}
                  onChange={e => { setOriginCity(e.target.value); setMileageResult(null); }}
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={computeTransit}
                  disabled={calculatingMiles || !originCity.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  {calculatingMiles ? '⟳ Calculating...' : 'Calculate Miles'}
                </button>
              </div>
            </div>

            {/* Multi-source results */}
            {mileageResult && (
              <div className="space-y-2">
                {/* Source breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                    <div className="text-blue-400 font-medium mb-1">📍 Google Maps Routes</div>
                    <div className="text-muted-foreground mb-1">
                      {mileageResult.googleRoutes.map((m, i) => (
                        <span key={i} className="mr-2">Route {i+1}: <span className="text-foreground">{m} mi</span></span>
                      ))}
                    </div>
                    <div className="font-bebas text-lg text-blue-400">{mileageResult.googleAvgMiles} mi avg</div>
                  </div>
                  <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-3">
                    <div className="text-orange-400 font-medium mb-1">🗺️ Trucker Path Estimate</div>
                    <div className="text-muted-foreground text-xs mb-1">Truck-optimized routing (weight limits, bridges)</div>
                    <div className="font-bebas text-lg text-orange-400">{mileageResult.truckerPathMiles} mi</div>
                  </div>
                  <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                    <div className="text-primary font-medium mb-1">⚖️ Final Billing Miles</div>
                    <div className="text-muted-foreground text-xs mb-1">Avg of both sources — used for all costs</div>
                    <div className="font-bebas text-2xl text-primary">{mileageResult.finalBillingMiles} mi</div>
                  </div>
                </div>

                {/* ETA + Shrink + Stress */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-card border border-border rounded-lg p-2 text-center">
                    <div className="text-muted-foreground">ETA Range</div>
                    <div className="font-bebas text-base text-foreground">{mileageResult.etaMinHrs}–{mileageResult.etaMaxHrs} hrs</div>
                    <div className="text-muted-foreground/70">{TRUCK_MPH_MIN}–{TRUCK_MPH_MAX} mph avg</div>
                  </div>
                  <div className={`border rounded-lg p-2 text-center ${effectiveShrink >= 4 ? 'bg-danger/10 border-danger/30' : effectiveShrink >= 3 ? 'bg-warning/10 border-warning/30' : 'bg-success/10 border-success/30'}`}>
                    <div className="text-muted-foreground">Shrink %</div>
                    <div className={`font-bebas text-base ${effectiveShrink >= 4 ? 'text-danger' : effectiveShrink >= 3 ? 'text-warning' : 'text-success'}`}>{effectiveShrink}%</div>
                    <div className="text-muted-foreground/70">{shrinkOverride ? 'manual' : 'auto'}</div>
                  </div>
                  <div className={`border rounded-lg p-2 text-center ${mileageResult.stressLevel === 'HIGH' ? 'bg-danger/10 border-danger/30' : mileageResult.stressLevel === 'MODERATE' ? 'bg-warning/10 border-warning/30' : 'bg-success/10 border-success/30'}`}>
                    <div className="text-muted-foreground">Stress</div>
                    <div className={`font-bebas text-base ${mileageResult.stressLevel === 'HIGH' ? 'text-danger' : mileageResult.stressLevel === 'MODERATE' ? 'text-warning' : 'text-success'}`}>{mileageResult.stressLevel}</div>
                    <div className="text-muted-foreground/70">transit</div>
                  </div>
                </div>

                {/* Stress protocol banner */}
                <div className={`px-3 py-2 rounded-lg border text-xs font-medium ${mileageResult.stressLevel === 'HIGH' ? 'bg-danger/10 border-danger/30 text-danger' : mileageResult.stressLevel === 'MODERATE' ? 'bg-warning/10 border-warning/30 text-warning' : 'bg-success/10 border-success/30 text-success'}`}>
                  {mileageResult.stressLevel === 'HIGH'
                    ? '⚠ HIGH STRESS HAUL (>600 mi) — Extended receiving protocol, metaphylaxis consideration, 28-day BRD monitoring'
                    : mileageResult.stressLevel === 'MODERATE'
                      ? '⚠ MODERATE HAUL (250–600 mi) — Standard BRD protocol, enhanced monitoring week 1–2'
                      : '✓ SHORT HAUL (<250 mi) — Low transit stress, normal receiving protocol'}
                </div>
              </div>
            )}

            {/* Shrink override */}
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">
                  Shrink % Override <span className="text-primary">(blank = auto from billing miles)</span>
                </label>
                <input type="number" step="0.1" placeholder={mileageResult ? `Auto: ${mileageResult.shrinkPct}%` : 'e.g. 3.5'}
                  className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                  value={shrinkOverride} onChange={e => setShrinkOverride(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Economics Inputs */}
        <div>
          <h4 className="font-bebas text-foreground text-base mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> CATTLE ECONOMICS
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Arrival Wt (lbs/hd)</label>
              <input type="number" placeholder={lot?.current_weight || lot?.purchase_weight || '700'}
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                value={arrivalWt} onChange={e => setArrivalWt(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Shipping Wt (lbs/hd)</label>
              <input type="number" placeholder={lot?.target_weight || '1300'}
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                value={shippingWt} onChange={e => setShippingWt(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Purchase Price ($/cwt)</label>
              <input type="number" step="0.01" placeholder={lot?.purchase_price || '150'}
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">ADG (lbs/hd/day)</label>
              <input type="number" step="0.1" placeholder="2.8"
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                value={adg} onChange={e => setAdg(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">COG ($/lb)</label>
              <input type="number" step="0.01" placeholder={lot?.cog || '0.90'}
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                value={cog} onChange={e => setCog(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Days on Feed</label>
              <input type="number" placeholder="Auto from ADG"
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                value={daysOnFeed} onChange={e => setDaysOnFeed(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Interest Rate (%/yr)</label>
              <input type="number" step="0.1" placeholder="8"
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                value={interestRate} onChange={e => setInterestRate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Intake Date</label>
              <input type="date" className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                value={intakeDate} onChange={e => setIntakeDate(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Trucking Cost Engine */}
        <div>
          <h4 className="font-bebas text-foreground text-base mb-3 flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary" /> FREIGHT COST ENGINE (Semi + 4-deck pot)
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Haul In Miles
                {mileageResult && <span className="text-primary ml-1">← auto: {mileageResult.finalBillingMiles} billing mi</span>}
              </label>
              <input type="number" step={10}
                placeholder={mileageResult ? `${mileageResult.finalBillingMiles} mi (billing)` : 'Run mileage calc above'}
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground bg-secondary/30 cursor-not-allowed"
                value={mileageResult ? mileageResult.finalBillingMiles : ''}
                readOnly
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Haul Out Miles</label>
              <input type="number" step={10}
                placeholder="200"
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                value={truckMilesOut} onChange={e => setTruckMilesOut(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Head / Load</label>
              <input type="number" step={1} placeholder="40"
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                value={headOnLoad} onChange={e => setHeadOnLoad(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Diesel $/gal (route avg)</label>
              <input type="number" step={0.05} placeholder="3.60"
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                value={dieselFeed} onChange={e => setDieselFeed(e.target.value)} />
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-2">
              <div className="text-muted-foreground">Freight In ({haulInMiles} billing mi)</div>
              <div className="font-bebas text-lg text-primary">${autoFreightIn.toFixed(2)}/hd</div>
              <div className="text-muted-foreground/70">${freightInResult.ratePerMile.toFixed(2)}/mi | Driver ${freightInResult.driverPayPerLoad.toFixed(0)}/load</div>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-2">
              <div className="text-muted-foreground">Freight Out ({haulOutMiles} mi)</div>
              <div className="font-bebas text-lg text-primary">${autoFreightOut.toFixed(2)}/hd</div>
              <div className="text-muted-foreground/70">${freightOutResult.ratePerMile.toFixed(2)}/mi | Driver ${freightOutResult.driverPayPerLoad.toFixed(0)}</div>
            </div>
            <div className="bg-warning/5 border border-warning/20 rounded-lg p-2 col-span-2">
              <div className="text-muted-foreground">Total Freight Cost</div>
              <div className="font-bebas text-xl text-warning">${(autoFreightIn + autoFreightOut).toFixed(2)}/hd</div>
              <div className="text-muted-foreground/70">Diesel: ${haulDiesel}/gal | {TRUCKING_DEFAULTS.mpgLoaded} MPG | Driver: {(TRUCKING_DEFAULTS.driverPctAvg * 100).toFixed(1)}% of gross | Includes fixed cost amortization</div>
            </div>
          </div>
        </div>

        {/* Additional context */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Additional Notes / Special Instructions</label>
          <textarea rows={2} placeholder="e.g. High morbidity last 2 weeks, CAB-eligible, avoid beta-agonists for export market..."
            className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground resize-none"
            value={additionalContext} onChange={e => setAdditionalContext(e.target.value)} />
        </div>

        {/* Lot context preview */}
        {lot && (
          <div className="flex flex-wrap gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg text-xs">
            <span className="text-primary font-medium">Lot Loaded:</span>
            <span className="text-muted-foreground">{getCattleLabel(lot.breed_type, lot.sex)} | {lot.head_count} hd | {lot.current_weight || lot.purchase_weight} lbs | Stage: {lot.stage}</span>
            {market && <span className="text-success">+ LC ${market.lc_futures} | FC ${market.gf_futures}</span>}
            {feedProtocols.length > 0 && <span className="text-success">+ {feedProtocols.length} feed commodities</span>}
            {healthProtocols.length > 0 && <span className="text-success">+ {healthProtocols.length} health protocols</span>}
            {healthEvents.length > 0 && <span className="text-warning">+ {healthEvents.length} health events</span>}
          </div>
        )}

        <div className="flex items-center gap-4 flex-wrap">
          <button onClick={generatePlan} disabled={loading}
            className="flex items-center gap-3 px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bebas text-lg tracking-wide hover:bg-primary/90 disabled:opacity-60 transition-colors">
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {loading ? 'GENERATING...' : plan ? 'GENERATE NEW PLAN' : 'GENERATE PLAN'}
          </button>
          {currentSavedPlanId && !loading && (
            <div className="flex items-center gap-1.5 text-xs text-success">
              <Save className="w-3.5 h-3.5" /> Auto-saved
            </div>
          )}
        </div>
        {loading && <p className="text-xs text-muted-foreground">Generating from your inputs + live LC/FC boards...</p>}
      </div>

      {/* Results */}
      {plan && (
        <div className="space-y-4">
          {/* KPIs */}
          {(plan.estimated_profit_per_head != null || plan.estimated_roi_percent != null || plan.estimated_cost_per_head != null) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Est. Profit / Head', value: plan.estimated_profit_per_head != null ? `${plan.estimated_profit_per_head >= 0 ? '+' : ''}$${plan.estimated_profit_per_head}` : '—', color: plan.estimated_profit_per_head >= 0 ? 'text-success' : 'text-danger' },
                { label: 'Est. ROI %', value: plan.estimated_roi_percent != null ? `${plan.estimated_roi_percent.toFixed(1)}%` : '—', color: plan.estimated_roi_percent >= 0 ? 'text-success' : 'text-danger' },
                { label: 'Cost / Head', value: plan.estimated_cost_per_head != null ? `$${plan.estimated_cost_per_head}` : '—', color: 'text-warning' },
                { label: 'Target Grade', value: plan.target_grade || '—', color: 'text-primary' },
              ].map(k => (
                <div key={k.label} className="bg-card border border-border rounded-xl p-4 text-center">
                  <div className={`font-bebas text-2xl ${k.color}`}>{k.value}</div>
                  <div className="text-xs text-muted-foreground">{k.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* USDA Weight Compliance + Expected Out Date */}
          {(plan._expectedOutDate || plan._usdaLimit) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {plan._expectedOutDate && (
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <div className="font-bebas text-xl text-primary">{plan._expectedOutDate}</div>
                  <div className="text-xs text-muted-foreground">Expected Out Date</div>
                </div>
              )}
              {plan._usdaLimit && (
                <div className={`border rounded-xl p-4 text-center ${plan._weightCompliant === false ? 'bg-danger/10 border-danger/30' : 'bg-success/10 border-success/30'}`}>
                  <div className={`font-bebas text-xl ${plan._weightCompliant === false ? 'text-danger' : 'text-success'}`}>
                    {plan._usdaLimit.grade}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {plan._weightCompliant === false ? `⚠ Over ${plan._gradeMaxWt} lbs` : '✓ Weight compliant'}
                  </div>
                </div>
              )}
              {plan._mileageResult && (
                <>
                  <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-center">
                    <div className="font-bebas text-xl text-primary">{plan._mileageResult.finalBillingMiles} mi</div>
                    <div className="text-xs text-muted-foreground">Billing Miles</div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4 text-center">
                    <div className="font-bebas text-xl text-foreground">{plan._mileageResult.etaMinHrs}–{plan._mileageResult.etaMaxHrs} hrs</div>
                    <div className="text-xs text-muted-foreground">ETA ({TRUCK_MPH_MIN}–{TRUCK_MPH_MAX} mph)</div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Summary */}
          {plan.summary && (
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-bebas text-primary text-base">EXECUTIVE SUMMARY</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{plan.summary}</p>
            </div>
          )}

          {/* Sections */}
          <div className="space-y-3">
            {plan.ration_program && planType !== 'vaccination' && (
              <PlanSection title="🌾 FEED RATION PROGRAM" icon={Wheat}
                color="bg-amber-500/5 border-amber-500/20 text-amber-200"
                content={plan.ration_program} defaultOpen={true} />
            )}
            {plan.vaccination_schedule && planType !== 'ration' && (
              <PlanSection title="💉 VACCINATION & HEALTH SCHEDULE" icon={Syringe}
                color="bg-success/5 border-success/20 text-success"
                content={plan.vaccination_schedule} defaultOpen={planType === 'vaccination'} />
            )}
            {plan.economic_projection && (
              <PlanSection title="📊 ECONOMIC PROJECTION" icon={TrendingUp}
                color="bg-blue-500/5 border-blue-500/20 text-blue-300"
                content={plan.economic_projection} defaultOpen={true} />
            )}
            {plan.ai_recommendations && (
              <PlanSection title="⚡ AI RECOMMENDATIONS" icon={Sparkles}
                color="bg-primary/5 border-primary/20 text-primary"
                content={plan.ai_recommendations} defaultOpen={false} />
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center pt-2">
            {plan._fallback
              ? '⚡ Data-driven analysis from your inputs + live LC/FC boards. Validate with your nutritionist and veterinarian.'
              : 'AI-generated using live market data, transit info, and lot performance. Validate with your nutritionist and veterinarian.'}
          </p>
        </div>
      )}
    </div>
  );
}