import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import SectionHeader from '@/components/SectionHeader';
import { Sparkles, RefreshCw, ChevronDown, ChevronRight, Users, Truck, Wrench, Wheat, TrendingUp, Building2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const DOMAINS = [
  { value: 'all', label: 'Full Operations Review', icon: Sparkles, color: 'text-primary' },
  { value: 'staff', label: 'Staffing & HR', icon: Users, color: 'text-amber-400' },
  { value: 'trucking', label: 'Trucking & Logistics', icon: Truck, color: 'text-orange-400' },
  { value: 'feedlot', label: 'Feedlot & Ranch Ops', icon: Wheat, color: 'text-green-400' },
  { value: 'maintenance', label: 'Maintenance & Facilities', icon: Wrench, color: 'text-red-400' },
  { value: 'financial', label: 'Financial & Entity Structure', icon: Building2, color: 'text-blue-400' },
  { value: 'market', label: 'Market Strategy & ROI', icon: TrendingUp, color: 'text-purple-400' },
];

function AdvisorSection({ title, color, content, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/30 transition-colors text-left">
        <span className={`font-bebas text-lg tracking-wide ${color}`}>{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-border">
          <div className="mt-4 text-sm text-foreground leading-relaxed whitespace-pre-wrap">{content}</div>
        </div>
      )}
    </div>
  );
}

export default function AIOpsAdvisor() {
  const [domain, setDomain] = useState('all');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState(null);

  const { data: staff = [] } = useQuery({ queryKey: ['staffDirectory'], queryFn: () => base44.entities.StaffDirectory.list('full_name', 200) });
  const { data: lots = [] } = useQuery({ queryKey: ['activeLots'], queryFn: () => base44.entities.CattleLot.filter({ status: 'active' }) });
  const { data: tickets = [] } = useQuery({ queryKey: ['maintenanceTickets'], queryFn: () => base44.entities.MaintenanceTicket.list('-created_date', 50) });
  const { data: feedOrders = [] } = useQuery({ queryKey: ['feedOrders'], queryFn: () => base44.entities.PenFeedOrder.list('-feed_date', 50) });
  const { data: entities = [] } = useQuery({ queryKey: ['operatingEntities'], queryFn: () => base44.entities.OperatingEntity.list('tier', 50) });
  const { data: market = [] } = useQuery({ queryKey: ['marketInputs'], queryFn: () => base44.entities.MarketInputs.list('-date', 1) });
  const { data: healthEvents = [] } = useQuery({ queryKey: ['healthEventsAll'], queryFn: () => base44.entities.LotHealthEvent.list('-event_date', 50) });

  const buildPrompt = () => {
    const mkt = market[0];
    const openTickets = tickets.filter(t => t.status !== 'completed');
    const staffByRole = staff.reduce((acc, s) => { acc[s.role] = (acc[s.role] || 0) + 1; return acc; }, {});
    const lotSummary = lots.map(l => `${l.cattle_class} ${l.head_count}hd @${l.current_weight || l.purchase_weight}lbs ${l.yard}`).join('; ');
    const entitySummary = entities.map(e => `${e.entity_name} (${e.tier}) - ${e.status}`).join('; ');
    const recentHealth = healthEvents.slice(0, 10).map(e => `${e.event_type} ${e.head_affected}hd ${e.event_date}`).join('; ');
    const urgentTickets = openTickets.filter(t => t.priority === 'urgent').map(t => `${t.title} @${t.entity}`).join('; ');

    return `You are a world-class livestock operations advisor, organizational consultant, and business strategist with deep expertise in:
- Multi-entity cattle operations (feedlots, ranches, trucking, sales)
- Corporate trust and LLC structures
- Agricultural workforce management
- Cattle feeding, health, and production economics
- Logistics and supply chain optimization
- Maintenance planning and capital expenditure

You are advising Continental Cattle Co and all its operating entities (trusts, corporation, LLCs).

CURRENT OPERATIONAL SNAPSHOT:
- Corporate Structure: ${entitySummary || 'Not configured'}
- Active Cattle Lots: ${lots.length} lots, ${lots.reduce((s, l) => s + (l.head_count || 0), 0)} total head
  ${lotSummary}
- Staff: ${staff.length} total — ${JSON.stringify(staffByRole)}
- Open Maintenance Tickets: ${openTickets.length} (${urgentTickets ? 'URGENT: ' + urgentTickets : 'none urgent'})
- Pending Feed Orders: ${feedOrders.filter(f => f.status === 'scheduled').length}
- Recent Health Events: ${recentHealth || 'None logged'}
${mkt ? `- Live Market: LC Futures $${mkt.lc_futures}/cwt, Choice Cutout $${mkt.choice_cutout}/cwt, Corn $${mkt.corn_price}/bu` : ''}
${context ? `\nADDITIONAL CONTEXT FROM USER: ${context}` : ''}

DOMAIN FOCUS: ${DOMAINS.find(d => d.value === domain)?.label || 'Full Operations'}

Generate a comprehensive advisory report with the following sections:

## 🚨 IMMEDIATE ACTION ITEMS
List the top 5-7 things that need attention RIGHT NOW — critical issues, urgent maintenance, market timing, staffing gaps, health alerts.

## 👥 STAFFING ANALYSIS & RECOMMENDATIONS
- Review current staffing by role and department
- Identify gaps for a full multi-entity operation (truck owners, drivers, dispatch, cowboys, feed mill, maintenance, welders, office, sales reps, field reps)
- Specific hiring recommendations with job descriptions and pay rate benchmarks
- Which entities need dedicated staff vs. shared resources
- Cross-training opportunities

## 🚛 TRUCKING & LOGISTICS OPTIMIZATION
- Fleet and driver capacity assessment
- Dispatch efficiency recommendations
- Load optimization and deadhead reduction
- Compliance (CDL, DOT hours) considerations
- Owner-operator vs. company driver trade-offs

## 🐄 RANCH & FEEDLOT OPERATIONS
- Current lot performance assessment
- Health event patterns and protocol adjustments
- Feed efficiency opportunities
- Pen management and stocking density
- Labor efficiency for cowboys and feed truck drivers

## 🔧 MAINTENANCE & FACILITIES
- Priority work order analysis
- Preventive maintenance schedule recommendations
- Budget estimate for deferred maintenance
- Equipment lifecycle assessment

## 🏢 CORPORATE STRUCTURE & ENTITY OPTIMIZATION
- How to best allocate staff across the LLC structure
- Revenue and expense routing recommendations
- Which entities need their own dedicated resources
- Inter-entity service agreements (trucking LLC billing cattle LLC, etc.)

## 📈 MARKET STRATEGY & FINANCIAL OUTLOOK
- Current market positioning
- Break-even analysis and risk exposure
- Timing recommendations for selling lots
- Hedging or futures strategies given current prices

## 🤖 AI MONITORING RECOMMENDATIONS
- What KPIs to track daily/weekly/monthly
- Alert thresholds to set up
- Automation opportunities to reduce manual work
- Data collection improvements for better AI insights

## 🗺️ 90-DAY ACTION PLAN
Prioritized roadmap with specific actions, responsible parties, and expected outcomes.`;
  };

  const generateFallbackReport = () => {
    const mkt = market[0];
    const activeLots = lots;
    const totalHead = activeLots.reduce((s, l) => s + (l.head_count || 0), 0);
    const openTickets = tickets.filter(t => t.status !== 'completed');
    const urgentTickets = openTickets.filter(t => t.priority === 'urgent');
    const highTickets = openTickets.filter(t => t.priority === 'high');
    const activeStaff = staff.filter(s => s.status === 'active');
    const lc = mkt?.lc_futures || 241;
    const choice = mkt?.choice_cutout || 324;
    const corn = mkt?.corn_price || 4.22;
    const spread = choice - lc;
    const recentPulls = healthEvents.filter(e => e.event_type === 'pull');
    const recentDeaths = healthEvents.filter(e => e.event_type === 'death');
    const morbidityRate = totalHead > 0 ? ((recentPulls.reduce((s, e) => s + (e.head_affected || 0), 0) / totalHead) * 100).toFixed(1) : 0;

    const deptMap = activeStaff.reduce((acc, s) => { acc[s.department] = (acc[s.department] || 0) + 1; return acc; }, {});
    const criticalRisks = [];
    if (urgentTickets.length > 0) criticalRisks.push(`${urgentTickets.length} urgent maintenance tickets`);
    if (Number(morbidityRate) > 10) criticalRisks.push(`High morbidity rate: ${morbidityRate}%`);
    if (recentDeaths.length > 0) criticalRisks.push(`${recentDeaths.reduce((s, e) => s + (e.head_affected || 0), 0)} head deaths logged`);
    if (lc < 225) criticalRisks.push('LC Futures below $225 — margin compression risk');
    if (corn > 5.00) criticalRisks.push('Corn above $5.00 — COG pressure');

    const healthScore = Math.max(20, Math.min(100, 100
      - (urgentTickets.length * 8)
      - (highTickets.length * 3)
      - (Number(morbidityRate) > 10 ? 15 : Number(morbidityRate) > 5 ? 7 : 0)
      - (lc < 225 ? 12 : lc < 235 ? 5 : 0)
      - (corn > 5 ? 8 : corn > 4.5 ? 3 : 0)
      + (lc > 240 ? 5 : 0)
      + (spread > 80 ? 5 : 0)
    ));

    const immediate = [
      urgentTickets.length > 0 ? `🔴 URGENT: ${urgentTickets.length} maintenance ticket(s) require immediate attention: ${urgentTickets.map(t => t.title + ' @' + (t.entity || t.location || '?')).join(', ')}` : null,
      recentDeaths.length > 0 ? `🔴 ${recentDeaths.reduce((s, e) => s + (e.head_affected || 0), 0)} head deaths in recent events — review health protocols immediately` : null,
      Number(morbidityRate) > 10 ? `🔴 Morbidity rate at ${morbidityRate}% — exceeds 10% threshold. Pull rate review and treatment protocol adjustment required.` : null,
      lc > 240 ? `✅ LC Futures at $${lc}/cwt — PRIME SELL WINDOW. Review which lots are at target weight and schedule marketing.` : `⚠️ LC at $${lc}/cwt — monitor for sell timing, target above $235 for optimal margins.`,
      spread > 80 ? `✅ Cutout spread $${spread.toFixed(0)}/cwt — packers bidding up, favorable for finished cattle.` : `⚠️ Cutout spread $${spread.toFixed(0)}/cwt — tighter than optimal, monitor weekly.`,
      highTickets.length > 0 ? `⚠️ ${highTickets.length} high-priority maintenance items need scheduling this week.` : null,
      feedOrders.filter(f => f.status === 'scheduled').length === 0 && activeLots.length > 0 ? `⚠️ No scheduled feed orders found — verify feed delivery pipeline for ${activeLots.length} active lots.` : null,
    ].filter(Boolean).join('\n\n');

    const staffingReport = `STAFFING OVERVIEW (DATA FROM DIRECTORY)
Total Staff On Record: ${staff.length} | Active: ${activeStaff.length}

BY DEPARTMENT:
${Object.entries(deptMap).map(([dept, count]) => `• ${dept}: ${count} staff`).join('\n') || '• No department data entered yet'}

STAFFING GAP ANALYSIS:
• Trucking/Hauling: ${deptMap['Trucking'] || 0} on record ${(deptMap['Trucking'] || 0) < 3 ? '⚠️ — typically need 3–5 drivers for multi-yard ops' : '✅'}
• Ranch/Feedlot Ops: ${deptMap['Ranch Ops'] || 0} cowboys + ${deptMap['Feedlot'] || 0} feedlot staff ${((deptMap['Ranch Ops'] || 0) + (deptMap['Feedlot'] || 0)) < 2 ? '⚠️ — consider adding coverage' : '✅'}
• Maintenance: ${deptMap['Maintenance'] || 0} on record ${(deptMap['Maintenance'] || 0) < 1 ? '⚠️ — at least 1 full-time maintenance/welder recommended' : '✅'}
• Management/Office: ${(deptMap['Management'] || 0) + (deptMap['Financial'] || 0) + (deptMap['Executive'] || 0)} staff

CDL DRIVERS: ${staff.filter(s => s.cdl_number).length} with CDL on file
${staff.filter(s => s.cdl_expiry && new Date(s.cdl_expiry) < new Date(Date.now() + 90 * 86400000)).length > 0 ? '⚠️ CDLs expiring within 90 days: ' + staff.filter(s => s.cdl_expiry && new Date(s.cdl_expiry) < new Date(Date.now() + 90 * 86400000)).map(s => s.full_name).join(', ') : '✅ No CDLs expiring in next 90 days'}`;

    const ranchReport = `RANCH & FEEDLOT OPERATIONS SUMMARY
Active Lots: ${activeLots.length} | Total Head: ${totalHead.toLocaleString()}

LOT BREAKDOWN:
${activeLots.slice(0, 10).map(l => `• ${l.lot_id || l.cattle_class} | ${l.head_count} hd | ${l.current_weight || l.purchase_weight} lbs | ${l.yard || '—'} Pen ${l.pen || '—'} | Stage: ${l.stage} | Status: ${l.status}`).join('\n') || '• No active lots on record'}

HEALTH SUMMARY (Last ${healthEvents.length} Events):
• Pulls: ${recentPulls.length} events (${recentPulls.reduce((s, e) => s + (e.head_affected || 0), 0)} head affected)
• Deaths: ${recentDeaths.length} events (${recentDeaths.reduce((s, e) => s + (e.head_affected || 0), 0)} head)
• Morbidity Rate: ${morbidityRate}% ${Number(morbidityRate) > 10 ? '⚠️ ELEVATED' : '✅ Normal'}
• Follow-ups pending: ${healthEvents.filter(e => e.follow_up_required && !e.notes?.includes('done')).length}

FEED OPERATIONS:
• Pending feed orders: ${feedOrders.filter(f => f.status === 'scheduled').length}
• Completed today: ${feedOrders.filter(f => f.status === 'complete' && f.feed_date === new Date().toISOString().split('T')[0]).length}`;

    const maintenanceReport = `MAINTENANCE & FACILITIES SUMMARY
Open Tickets: ${openTickets.length} | Urgent: ${urgentTickets.length} | High: ${highTickets.length}

${urgentTickets.length > 0 ? 'URGENT — DO NOW:\n' + urgentTickets.map(t => `🔴 ${t.title} | ${t.entity || ''} | ${t.location || ''} | Reported by: ${t.reported_by || '?'}`).join('\n') : ''}

${highTickets.length > 0 ? 'HIGH PRIORITY — THIS WEEK:\n' + highTickets.map(t => `🟠 ${t.title} | ${t.entity || ''} | ${t.category || ''}`).join('\n') : ''}

BY CATEGORY:
${['fence_repair','equipment','welding','plumbing','electrical','vehicle','building','other'].map(cat => {
  const count = openTickets.filter(t => t.category === cat).length;
  return count > 0 ? `• ${cat.replace('_',' ')}: ${count} open` : null;
}).filter(Boolean).join('\n') || '• No open maintenance tickets ✅'}

EST. LABOR HOURS OUTSTANDING: ${openTickets.reduce((s, t) => s + (t.estimated_hours || 4), 0)} hrs`;

    const marketReport = `MARKET STRATEGY & FINANCIAL OUTLOOK
Data: ${mkt?.date || 'Latest available'}

CURRENT MARKET:
• Live Cattle Futures: $${lc}/cwt ${lc > 240 ? '✅ STRONG' : lc > 225 ? '▲ MODERATE' : '⚠️ WEAK'}
• Choice Cutout: $${choice}/cwt
• Cutout Spread: $${spread.toFixed(2)}/cwt ${spread > 80 ? '✅ Wide — favor selling' : '⚠️ Narrow — monitor'}
• Corn: $${corn}/bu ${corn < 4.50 ? '✅ Favorable COG' : '⚠️ Elevated — watch margins'}
• SBM: $${mkt?.sbm_price || '—'}/ton
• 90s Trim: $${mkt?.trim_90s || '—'}/lb ${mkt?.trim_90s > 3.00 ? '✅ Strong cow/bull signal' : ''}
• Basis (Southern Plains): $${mkt?.basis_southern_plains || '—'}/cwt

PORTFOLIO EXPOSURE:
${activeLots.slice(0, 5).map(l => {
  const w = l.current_weight || l.purchase_weight || 0;
  const val = w * (l.purchase_price || 150) / 100 * l.head_count;
  const estRevenue = l.target_weight ? l.target_weight * (lc / 100) * l.head_count : 0;
  return `• ${l.lot_id || l.cattle_class}: ${l.head_count} hd | Est. value $${(val/1000).toFixed(0)}K${estRevenue ? ' | Est. sell $' + (estRevenue/1000).toFixed(0) + 'K' : ''}`;
}).join('\n') || '• No active lots'}

SIGNAL: ${lc > 240 ? 'SELL — premium window open. Prioritize finishing cattle for market.' : lc > 230 ? 'HOLD/WATCH — decent market but not peak. Monitor weekly.' : 'CAUTION — consider hedging strategy. Break-even analysis recommended before committing buys.'}`;

    const actionPlan = `90-DAY DATA-DRIVEN ACTION PLAN

WEEK 1–2 (IMMEDIATE):
${urgentTickets.length > 0 ? `□ Resolve ${urgentTickets.length} urgent maintenance ticket(s)\n` : ''}${Number(morbidityRate) > 10 ? `□ Emergency health protocol review — morbidity at ${morbidityRate}%\n` : ''}□ Verify all active lot feed orders are scheduled
□ Confirm CDL renewals for any drivers expiring within 90 days
${lc > 240 ? '□ Market ready cattle NOW — LC futures favorable' : '□ Run break-even analysis on each lot approaching target weight'}

MONTH 1 (DAYS 1–30):
□ Update all lot current weights and stage status
□ Close or update all completed maintenance tickets
□ Enter missing staff records in directory (${staff.length < 5 ? 'directory appears incomplete' : 'verify completeness'})
□ Log daily feed orders to build historical data

MONTH 2 (DAYS 31–60):
□ Review COG vs. actual for closed lots
□ Schedule preventive maintenance on equipment
□ Review entity financials for each operating entity
□ Analyze morbidity patterns and adjust health protocols

MONTH 3 (DAYS 61–90):
□ Full operational review: lots opened/closed, staff changes, entity P&L
□ Update market inputs regularly for accurate projections
□ Review and update buying guides based on actual performance
□ Plan next buying cycle based on market outlook

ONGOING KPIs TO TRACK:
• Morbidity rate: target <5% | current ${morbidityRate}%
• Mortality rate: target <1%
• COG actual vs. budget per lot
• Feed order completion rate
• Maintenance ticket resolution time`;

    const structureReport = `CORPORATE STRUCTURE SUMMARY
Entities on Record: ${entities.length}
${entities.map(e => `• ${e.entity_name} | ${e.entity_type} | ${e.tier} | ${e.status}${e.responsible_manager ? ' | Mgr: ' + e.responsible_manager : ''}`).join('\n') || '• No entity data configured — add entities in Corporate Structure page'}

QUICK CHECKS:
• Entities without EIN: ${entities.filter(e => !e.ein).length}
• Inactive entities: ${entities.filter(e => e.status === 'inactive').length}
• Entities missing manager: ${entities.filter(e => !e.responsible_manager).length}`;

    return {
      executive_summary: `Data-driven operations report for Continental Cattle Co. ${activeLots.length} active lots | ${totalHead.toLocaleString()} head | ${activeStaff.length} active staff | ${openTickets.length} open maintenance tickets. Market: LC $${lc}/cwt, Cutout $${choice}/cwt, Corn $${corn}/bu. Operational health score: ${healthScore}/100. ${criticalRisks.length > 0 ? 'Critical items: ' + criticalRisks.join('; ') + '.' : 'No critical risks detected.'}`,
      immediate_actions: immediate || '✅ No critical immediate items detected from current data.',
      staffing: staffingReport,
      trucking: `TRUCKING & LOGISTICS\nDrivers with CDL on file: ${staff.filter(s => s.cdl_number).length}\nTrucking department staff: ${deptMap['Trucking'] || 0}\nTruck numbers logged: ${staff.filter(s => s.truck_number).length}\n\nReview Load Board for active dispatch needs. Ensure all CDL holders have current licenses. For detailed load optimization, log loads via the Load Board page.`,
      ranch_feedlot: ranchReport,
      maintenance: maintenanceReport,
      corporate_structure: structureReport,
      market_strategy: marketReport,
      ai_monitoring: `KEY METRICS TO MONITOR DAILY:\n• LC Futures (target >$235)\n• Morbidity rate per lot (alert >10%)\n• Pending feed orders (should never be 0 with active lots)\n• Open urgent maintenance tickets (target: 0)\n\nWEEKLY:\n• Weight checks on finishing lots\n• COG vs. budget review\n• Entity P&L reconciliation\n\nMONTHLY:\n• Full lot performance review\n• Staff directory audit\n• Corporate structure financial update\n\nNote: All AI-powered monitoring alerts require integration credits. Current data-driven checks run on page load.`,
      action_plan_90day: actionPlan,
      critical_risk_count: criticalRisks.length,
      opportunity_count: (lc > 240 ? 1 : 0) + (spread > 80 ? 1 : 0) + (mkt?.trim_90s > 3.00 ? 1 : 0),
      overall_health_score: healthScore,
      _fallback: true,
    };
  };

  const generate = async () => {
    setLoading(true);
    setAdvice(null);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: buildPrompt(),
        model: 'claude_sonnet_4_6',
        response_json_schema: {
          type: 'object',
          properties: {
            executive_summary: { type: 'string' },
            immediate_actions: { type: 'string' },
            staffing: { type: 'string' },
            trucking: { type: 'string' },
            ranch_feedlot: { type: 'string' },
            maintenance: { type: 'string' },
            corporate_structure: { type: 'string' },
            market_strategy: { type: 'string' },
            ai_monitoring: { type: 'string' },
            action_plan_90day: { type: 'string' },
            critical_risk_count: { type: 'number' },
            opportunity_count: { type: 'number' },
            overall_health_score: { type: 'number', description: '0-100 operational health score' },
          }
        }
      });
      setAdvice(result);
      toast.success('AI Operations Report generated');
    } catch (err) {
      const fallback = generateFallbackReport();
      setAdvice(fallback);
      toast.info('AI unavailable — showing data-driven report from your records');
    }
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <SectionHeader
        title="AI OPERATIONS ADVISOR"
        subtitle="Full-spectrum AI oversight and recommendations across all entities, staff, logistics, and financials"
        badge="AI POWERED"
      />

      {/* Config */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <h3 className="font-bebas text-primary text-lg">CONFIGURE ADVISORY SCOPE</h3>

        <div>
          <label className="text-xs text-muted-foreground mb-2 block">Focus Domain</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {DOMAINS.map(d => (
              <button key={d.value} onClick={() => setDomain(d.value)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors text-left ${
                  domain === d.value ? 'bg-primary/15 border-primary/30 text-foreground' : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                }`}>
                <d.icon className={`w-4 h-4 flex-shrink-0 ${d.color}`} />
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Additional Context or Specific Questions</label>
          <textarea rows={3} placeholder="e.g. We're expanding to a new yard, considering hiring 3 more drivers, having BRD issues in lot X, market looks bearish next 30 days..."
            className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground resize-none"
            value={context} onChange={e => setContext(e.target.value)} />
        </div>

        {/* Data context preview */}
        <div className="flex flex-wrap gap-3 p-3 bg-secondary/30 rounded-lg text-xs">
          <span className="text-muted-foreground font-medium">AI has access to:</span>
          <span className="text-success">{lots.length} active lots ({lots.reduce((s,l) => s+(l.head_count||0), 0)} hd)</span>
          <span className="text-success">{staff.length} staff records</span>
          <span className="text-success">{tickets.filter(t=>t.status!=='completed').length} open maintenance tickets</span>
          <span className="text-success">{entities.length} operating entities</span>
          {market[0] && <span className="text-success">Live market data</span>}
          <span className="text-success">{healthEvents.length} health events</span>
        </div>

        <button onClick={generate} disabled={loading}
          className="flex items-center gap-3 px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bebas text-lg tracking-wide hover:bg-primary/90 disabled:opacity-60 transition-colors">
          {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {loading ? 'ANALYZING ALL OPERATIONS...' : 'GENERATE AI OPERATIONS REPORT'}
        </button>
        {loading && <p className="text-xs text-muted-foreground">Analyzing staff, lots, maintenance, entities, market conditions... 20–40 seconds</p>}
      </div>

      {/* Results */}
      {advice && (
        <div className="space-y-4">
          {/* Health Score */}
          {(advice.overall_health_score != null || advice.critical_risk_count != null) && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Ops Health Score', value: advice.overall_health_score != null ? `${advice.overall_health_score}/100` : '—', color: advice.overall_health_score >= 70 ? 'text-success' : advice.overall_health_score >= 50 ? 'text-warning' : 'text-danger' },
                { label: 'Critical Risks', value: advice.critical_risk_count ?? '—', color: 'text-danger' },
                { label: 'Opportunities', value: advice.opportunity_count ?? '—', color: 'text-success' },
              ].map(k => (
                <div key={k.label} className="bg-card border border-border rounded-xl p-4 text-center">
                  <div className={`font-bebas text-3xl ${k.color}`}>{k.value}</div>
                  <div className="text-xs text-muted-foreground">{k.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Executive Summary */}
          {advice.executive_summary && (
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-bebas text-primary text-base">EXECUTIVE SUMMARY</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{advice.executive_summary}</p>
            </div>
          )}

          {advice.immediate_actions && <AdvisorSection title="🚨 IMMEDIATE ACTION ITEMS" color="text-danger" content={advice.immediate_actions} defaultOpen={true} />}
          {advice.staffing && <AdvisorSection title="👥 STAFFING ANALYSIS & RECOMMENDATIONS" color="text-amber-400" content={advice.staffing} />}
          {advice.trucking && <AdvisorSection title="🚛 TRUCKING & LOGISTICS" color="text-orange-400" content={advice.trucking} />}
          {advice.ranch_feedlot && <AdvisorSection title="🐄 RANCH & FEEDLOT OPERATIONS" color="text-green-400" content={advice.ranch_feedlot} />}
          {advice.maintenance && <AdvisorSection title="🔧 MAINTENANCE & FACILITIES" color="text-red-400" content={advice.maintenance} />}
          {advice.corporate_structure && <AdvisorSection title="🏢 CORPORATE STRUCTURE & ENTITY OPTIMIZATION" color="text-blue-400" content={advice.corporate_structure} />}
          {advice.market_strategy && <AdvisorSection title="📈 MARKET STRATEGY & FINANCIAL OUTLOOK" color="text-purple-400" content={advice.market_strategy} />}
          {advice.ai_monitoring && <AdvisorSection title="🤖 AI MONITORING RECOMMENDATIONS" color="text-primary" content={advice.ai_monitoring} />}
          {advice.action_plan_90day && <AdvisorSection title="🗺️ 90-DAY ACTION PLAN" color="text-success" content={advice.action_plan_90day} />}

          <p className="text-xs text-muted-foreground text-center pt-2">
            {advice._fallback
              ? '⚡ Data-driven report generated from your actual records (AI unavailable). Validate with your management team before implementing.'
              : 'AI-generated recommendations. Validate with your management team before implementing.'}
          </p>
        </div>
      )}
    </div>
  );
}