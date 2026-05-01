import { useState } from 'react';
import SectionHeader from '@/components/SectionHeader';
import { ChevronDown, ChevronRight, Search, BookOpen } from 'lucide-react';

const SECTIONS = [
  {
    category: 'EXECUTIVE SUMMARY', sections: [
      { num: 1, title: 'Market Reality (2026)', content: 'U.S. cattle herd at 70-year low. Feeder supply extremely tight. Cull cow supply historically tight. Imports up 6%, exports down 8%. Fed cattle forecast: $241.66/cwt live. 2026 is a high-price, low-supply, high-margin environment for operators who control cost of gain and marketing windows.' },
      { num: 2, title: 'Highest-ROI Cattle Classes (Ranked)', content: '1. Cull cows: 20–30% ROI (heavy carcass premiums, tight supply)\n2. Light calves 350–550 lb: 18–25% (cheapest gain, flexible exit)\n3. Bulls: 15–20% (high yield, strong kill bull demand)\n4. Day-old calves: 55–110% (multi-layer internal margins)\n5. Light calf quick flip: 2–5% (only at scale)\n6. Finishers: Negative (only profitable on premium grids)' },
      { num: 3, title: 'Day-Old Calves: Your #1 Profit Center', content: 'You control: dairies, pickup, calf ranch, grower, feedyard, trucking, marketing, resale. True ROI per day-old calf: $875–$1,650/head. ROI: 55–110%. Annualized: 180–260%. Most operators lose money from 400→1500 lb. You profit because you sell internally at 400 and 900 lb, capturing commission, freight, dispatch, marketing, and ownership margin.' },
    ]
  },
  {
    category: 'PRICING ENGINES', sections: [
      { num: 4, title: 'The Pricing Engine (CME + USDA Grid)', content: 'SaleValue/head = ((F + B)/D + GridAdj) / 100 × (W_live × D)\nF = CME live cattle futures\nB = basis (Southern Plains, Holstein, cow/bull)\nD = dressing % (USDA historical)\nGridAdj = weighted quality + yield premiums\nApplies to steers, heifers, cows, bulls, beef, dairy, beef×dairy' },
      { num: 5, title: '150-lb Increment Ladder System', content: 'Every cattle class valued in 150-lb steps from day-old (95 lb) up to 1600 lb for steers/heifers, 2100–2400 lb for cows/bulls. Each step includes: value, cost of gain, yardage, interest, freight, death loss, profit, ROI, profit per day, profit per load. Identifies optimal buy weights, sell weights, feeding windows, break-even points, and highest-ROI steps.' },
      { num: 6, title: 'Cutout-Based Valuation', content: 'Converts carcass weight into true economic value using primal yields, subprimal yields, cut prices, trim values, variety meats, and export premiums. Reveals: true carcass value, true live value, cutout-to-live spread, packer margin, operator margin. Essential for finished cattle, packer cows, packer bulls, railed animals.' },
      { num: 7, title: 'Import/Export Adjustment Engine', content: 'Imports/exports affect: lean trim (90s, 50s, 65s), short plates, short ribs, tongues, variety meats, chuck/round demand, foodservice vs retail demand. Adjustments modify cutout values, GridAdj, carcass values, and live values.' },
    ]
  },
  {
    category: 'ENTERPRISE MODEL', sections: [
      { num: 8, title: 'Full Enterprise Model (Day-Old → Rail)', content: 'Stage 1 (day-old→400): milk, starter, grower, labor, DL, interest, freight\nStage 2 (400→900): COG, yardage, interest, shrink, DL\nStage 3 (900→1500): COG, yardage, interest, GridAdj, dressing%\nStage 4 (1500→rail): carcass value, cutout, trim, variety meats, export premiums\nStage 5 (internal): commission, freight, dispatch, marketing, ownership' },
      { num: 36, title: 'Stage-by-Stage Cost & Profit Summary', content: 'Stage 1: total $1,861 cost / $1,950 sale / +$89 profit\nStage 2: total $2,381 cost / $2,295 sale / –$86 profit\nStage 3: total $3,161 cost / $2,925 sale / –$236 profit\nStage 4: 945 lb carcass / $4,953 cutout / +$355 live adj profit\nStage 5 internal: $875–$1,650/head total\nKey: internal transfer pricing makes the entire system profitable' },
    ]
  },
  {
    category: 'WEEKLY OPERATIONS', sections: [
      { num: 37, title: 'Weekly Buy/Sell/Feeding Playbook', content: 'BUY: 350–550 lb calves, 1100–1500 lb cows, 1400–1800 lb bulls\nFEED: 1100→1650 lb cows, 1400→2100 lb bulls, 700→1000 lb B×D steers\nSELL: 2000–2250 lb bulls, 1650–1850 lb cows, 1450–1600 lb B×D steers\nAVOID: Finishing Holsteins past 1450 lb, buying 550–700 lb Holsteins\nHEDGE: Aug LC if basis weak, GF if feeder market overheated\nWATCH: 90s trim imports from Australia, short plate exports to Korea, box beef movement' },
      { num: 38, title: 'Daily Buyer Sheet (Field-Ready)', content: 'BUY TODAY: 350–550 lb calves, 1100–1500 lb cows, 1400–1800 lb bulls, 700–900 lb B×D feeders\nDO NOT BUY: 550–700 lb Holsteins, 900–1200 lb Holsteins, 400–900 lb Holsteins unless internal transfer\nBUYER CHECKLIST: Frame score, body condition, feet/legs, age class, breed type, health indicators, shrink risk, transport distance' },
      { num: 59, title: 'Decision Tree: Buy, Feed, or Sell', content: 'BUY if: ROI > 12%, COG < $0.95/lb, basis favorable\nFEED if: next 150-lb step ROI > 5%, yardage available, feed cost stable\nSELL if: ROI < 3%, basis weak, cutout falling' },
    ]
  },
  {
    category: 'SENSITIVITY & RISK', sections: [
      { num: 41, title: 'COG Sensitivity Table', content: 'COG –20%: +8–12% ROI\nCOG –10%: +4–6% ROI\nCOG +10%: –4–6% ROI\nCOG +20%: –8–12% ROI\nCalves least sensitive. Finishers most sensitive. Cows/bulls moderately sensitive.' },
      { num: 42, title: 'Death Loss Sensitivity', content: 'DL –1%: +3–5% ROI\nDL +1%: –3–5% ROI\nDL +2%: –6–10% ROI\nDay-olds most sensitive. Cows/bulls least sensitive.' },
      { num: 43, title: 'Basis Sensitivity', content: 'Basis +$3/cwt: +4–6% ROI\nBasis +$1/cwt: +1–2% ROI\nBasis –$1/cwt: –1–2% ROI\nBasis –$3/cwt: –4–6% ROI\nB×D steers benefit most from strong basis. Holsteins suffer most.' },
      { num: 44, title: 'Grid Premium Sensitivity', content: 'Grid +$10/cwt: +6–10% ROI\nGrid +$5/cwt: +3–5% ROI\nGrid –$5/cwt: –3–5% ROI\nGrid –$10/cwt: –6–10% ROI\nB×D steers most grid-responsive. Holsteins least.' },
      { num: 45, title: 'Dressing % Sensitivity', content: 'Dress +1.5%: +4–7% ROI\nDress +1.0%: +2–4% ROI\nDress –1.0%: –2–4% ROI\nDress –1.5%: –4–7% ROI\nBulls benefit most. Holsteins suffer most.' },
      { num: 46, title: 'Cutout Sensitivity', content: 'Cutout +$20/cwt: +8–12% ROI\nCutout +$10/cwt: +4–6% ROI\nCutout –$10/cwt: –4–6% ROI\nCutout –$20/cwt: –8–12% ROI\nFinished cattle most affected. Calves unaffected.' },
      { num: 47, title: '90s Trim Price Sensitivity', content: 'Trim +$0.50/lb: +6–10% ROI (cows/bulls)\nTrim +$0.25/lb: +3–5% ROI\nTrim –$0.25/lb: –3–5% ROI\nTrim –$0.50/lb: –6–10% ROI\nCows/bulls most affected.' },
    ]
  },
  {
    category: 'HEDGING & MARKETS', sections: [
      { num: 40, title: 'Hedging Module (LC/GF/Corn/SBM)', content: 'Tools: LC futures, GF futures, corn futures, SBM futures, puts, calls, LRP\nRules: Hedge finished cattle when LC basis weakens. Hedge feeders when GF spikes above fundamentals. Hedge feed when corn volatility increases. Use puts to protect downside without capping upside.\nWindows: Aug LC hedge when basis > –$1.00. Oct LC when cutout weakens. GF when >$2.70/lb.' },
      { num: 58, title: 'Weekly Market Signals Dashboard', content: 'Monitor: LC trend, GF trend, corn trend, SBM trend, box beef trend, trim trend, basis trend, export trend, import trend. These signals feed the weekly playbook and hedging decisions.' },
    ]
  },
  {
    category: 'LOGISTICS & TRUCKING', sections: [
      { num: 51, title: 'Trucking & Logistics Model', content: 'Inputs: miles, fuel cost, driver cost, load weight, shrink, time windows\nOutputs: cost per load, cost per head, cost per mile, optimal routing, optimal scheduling\nTargets: $350–$650/load, $1.85–$2.35/mile' },
      { num: 68, title: 'Truckload Profitability Optimizer', content: 'For Grand Slam Cattle Co LLC and Full Count Trucking LLC.\nCost components: fuel, driver, tires/maintenance\nProfit targets: $350–$650/load, $1.85–$2.35/mile\nShrink tracking: reduces effective load value 1.5–3.5%' },
    ]
  },
  {
    category: 'SCALING & EXPANSION', sections: [
      { num: 75, title: 'Expansion Model (2026–2030)', content: 'Projects: herd availability, feed cost trends, basis trends, cutout trends, trucking cost trends, labor availability\nScenarios: slow rebuild, moderate rebuild, aggressive rebuild\nOutputs: expansion opportunities, risk zones, capital requirements, ROI projections' },
      { num: 95, title: '5-Year Strategic Plan (2026–2030)', content: 'Year 1: Expand calf program, add trucking capacity, strengthen packer relationships\nYear 2: Add yards, add dispatch capacity, add marketing capacity\nYear 3: Expand cow/bull program, expand B×D program\nYear 4: Add multi-state operations\nYear 5: Full enterprise optimization' },
      { num: 148, title: 'Advanced Enterprise Strategic Roadmap', content: 'Multi-state expansion across OK, TX, KS, NE, CO. Optimal yard locations by feed availability, labor, and trucking lanes. Build packer relationships regionally. Target throughput increase 20-40% annually through Y5.' },
    ]
  },
  {
    category: 'ENTITY STRUCTURE', sections: [
      { num: 76, title: 'Multi-Entity Profit Consolidation Model', content: 'Continental Cattle Co INC: marketing\nRincon Cattle Co LLC: sales rep\nFlying 3 Bar B Livestock LLC: sales rep\nGrand Slam Cattle Co LLC: dispatch\nFull Count Trucking LLC: hauling\nBeeson Bucking Bulls: trucking/overflow\nOutputs: profit per entity, per load, per week, per month, per year, consolidated enterprise profit' },
      { num: 73, title: 'Internal Transfer Pricing Optimizer', content: 'Stages: 95→400 lb, 400→900 lb, 900→1500 lb\nMargins captured at each stage: commission, freight, dispatch, marketing, ownership\nKey principle: capturing every transfer creates enterprise profit even when individual stages show losses' },
    ]
  },
];

export default function MasterDocument() {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({});

  const toggle = (key) => setExpanded(p => ({ ...p, [key]: !p[key] }));

  const filtered = SECTIONS.map(cat => ({
    ...cat,
    sections: cat.sections.filter(s =>
      !search || s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.content.toLowerCase().includes(search.toLowerCase()) ||
      String(s.num).includes(search)
    )
  })).filter(cat => cat.sections.length > 0);

  return (
    <div className="p-6 space-y-6">
      <SectionHeader
        title="MASTER DOCUMENT"
        subtitle="Continental Cattle Co INC — Master Cattle Economics System (2026 Edition)"
        badge="Sections 1–350+"
      />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search sections, topics, keywords..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-card border border-border rounded-lg pl-9 pr-4 py-3 text-foreground focus:border-primary/50 focus:outline-none"
        />
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>Sections indexed: <span className="text-primary">{SECTIONS.reduce((s, c) => s + c.sections.length, 0)}</span></span>
        <span>Categories: <span className="text-primary">{SECTIONS.length}</span></span>
        <span>Total system sections: <span className="text-primary">350+</span></span>
      </div>

      {/* Document */}
      <div className="space-y-4">
        {filtered.map((cat) => (
          <div key={cat.category} className="bg-card border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => toggle(cat.category)}
              className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-4 h-4 text-primary" />
                <span className="font-bebas text-lg text-foreground tracking-wide">{cat.category}</span>
                <span className="text-xs text-muted-foreground">{cat.sections.length} sections</span>
              </div>
              {expanded[cat.category] ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </button>

            {expanded[cat.category] && (
              <div className="border-t border-border divide-y divide-border/50">
                {cat.sections.map((s) => (
                  <div key={s.num}>
                    <button
                      onClick={() => toggle(`${cat.category}-${s.num}`)}
                      className="w-full flex items-center justify-between px-5 py-3 hover:bg-secondary/30 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-primary font-medium w-12">§{s.num}</span>
                        <span className="text-sm font-medium text-foreground">{s.title}</span>
                      </div>
                      {expanded[`${cat.category}-${s.num}`] ?
                        <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" /> :
                        <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                    </button>
                    {expanded[`${cat.category}-${s.num}`] && (
                      <div className="px-5 pb-4 ml-12">
                        <div className="text-sm text-muted-foreground whitespace-pre-line bg-secondary/30 rounded-lg p-4 leading-relaxed border border-border/50">
                          {s.content}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-card border border-primary/15 rounded-lg p-5 text-center">
        <div className="font-bebas text-2xl text-primary mb-2">SYSTEM EXPANDABLE TO 1,000+ SECTIONS</div>
        <p className="text-sm text-muted-foreground">
          Send additional sections and they will be added to the platform. Each section connects to the live calculators above.
        </p>
      </div>
    </div>
  );
}