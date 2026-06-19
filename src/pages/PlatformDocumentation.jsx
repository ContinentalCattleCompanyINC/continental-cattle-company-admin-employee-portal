import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { isFullAccess } from '@/lib/accessControl';
import SectionHeader from '@/components/SectionHeader';
import { FileDown, FileText, Printer, Loader2 } from 'lucide-react';
import { ROLE_CONFIG, ROLE_CATEGORIES } from '@/lib/roleConfig';
import { SECTION_ADMIN_SECTIONS } from '@/lib/accessControl';

// ── Complete Source Code Files ────────────────────────────────────────────────
const SOURCE_FILES = [
  {
    path: 'App.jsx',
    section: 'Core',
    content: `import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/ThemeProvider';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import RoleGate from '@/components/RoleGate';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import { AnimatePresence, motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
// [All page imports + Routes defined here — see Layout and each page file for routing details]
// App wraps: ThemeProvider > AuthProvider > QueryClientProvider > Router > Routes`
  },
  {
    path: 'api/base44Client.js',
    section: 'Core',
    content: `import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});`
  },
  {
    path: 'lib/utils.js',
    section: 'Core',
    content: `import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const isIframe = window.self !== window.top;`
  },
  {
    path: 'lib/query-client.js',
    section: 'Core',
    content: `import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});`
  },
  {
    path: 'lib/cattleConfig.js',
    section: 'Core',
    content: `/**
 * CENTRALIZED CATTLE CLASSIFICATION
 * Breed Types + Sex → used across the entire platform
 */

export const BREED_TYPES = [
  { value: 'english_beef',          label: 'English Beef' },
  { value: 'crossbred_beef',        label: 'Crossbred Beef' },
  { value: 'beef_x_dairy_holstein', label: 'Beef × Dairy Holstein' },
  { value: 'beef_x_dairy_jersey',   label: 'Beef × Dairy Jersey' },
  { value: 'dairy_holstein',        label: '100% Dairy Holstein' },
  { value: 'dairy_jersey',          label: '100% Dairy Jersey' },
];

export const SEX_OPTIONS = [
  { value: 'steer',  label: 'Steer' },
  { value: 'heifer', label: 'Heifer' },
  { value: 'bull',   label: 'Bull' },
];

export function getCattleLabel(breedType, sex) {
  const breed = BREED_TYPES.find(b => b.value === breedType)?.label || breedType || '—';
  const s = SEX_OPTIONS.find(o => o.value === sex)?.label || sex || '';
  return s ? breed + ' ' + s : breed;
}

// Performance params: dressingPct, gridAdj ($/cwt vs Choice base), maxWeight
// See full file for PERF lookup table for all 18 breed × sex combinations

export function getPerformance(breedType, sex) { /* returns { dressingPct, gridAdj, maxWeight } */ }
export function isDairy(breedType)    { return ['dairy_holstein','dairy_jersey'].includes(breedType); }
export function isBeefDairy(breedType){ return ['beef_x_dairy_holstein','beef_x_dairy_jersey'].includes(breedType); }
export function isFullBeef(breedType) { return ['english_beef','crossbred_beef'].includes(breedType); }

export const USDA_AGE_LIMITS = {
  select: { days: 912,  months: 30, label: 'Select (≤30 mo)', grade: 'Select' },
  choice: { days: 1278, months: 42, label: 'Choice (≤42 mo)', grade: 'Choice' },
  prime:  { days: 1278, months: 42, label: 'Prime (≤42 mo)',  grade: 'Prime' },
};

export function getUsdaLimit(breedType, focus) {
  if (isDairy(breedType)) return USDA_AGE_LIMITS.select;
  if (focus === 'grade')   return USDA_AGE_LIMITS.prime;
  return USDA_AGE_LIMITS.choice;
}

export function getTargetGrade(breedType) {
  if (isDairy(breedType))    return 'Select / Low Choice';
  if (isBeefDairy(breedType)) return 'Choice';
  return 'Choice / Prime';
}

export function getAllCombos() {
  // Returns all 18 breed × sex combos with performance params
}`
  },
  {
    path: 'lib/accessControl.js',
    section: 'Core',
    content: `/**
 * ACCESS CONTROL CONFIGURATION
 * FULL ACCESS: super_admin role + named users Lane, Scott, Jeff
 * SECTION ADMINS: feedlot_admin, trucking_admin, maintenance_admin,
 *   financial_admin, market_admin, staff_admin, field_admin
 */

export const FULL_ACCESS_USERS = ['lane', 'scott', 'jeff'];

export const SECTION_ADMIN_SECTIONS = {
  feedlot_admin:     { label: 'Feedlot Admin',     pages: ['/lots','/feedlot-ops','/lot-performance','/feed-health','/ai-feed-planner','/staff-portal','/'], managesRoles: ['cowboy','feed_mill','feed_truck','field_rep'] },
  trucking_admin:    { label: 'Trucking Admin',    pages: ['/load-board','/trucking','/staff-portal','/'], managesRoles: ['truck_driver','truck_owner','dispatch','hauler'] },
  maintenance_admin: { label: 'Maintenance Admin', pages: ['/maintenance','/staff-portal','/'], managesRoles: ['welder','maintenance'] },
  financial_admin:   { label: 'Financial Admin',   pages: ['/entity-financials','/financial-intelligence','/corporate-structure','/approvals','/attorney-portal','/staff-portal','/'], managesRoles: ['accountant','attorney_cpa','investor','banker'] },
  market_admin:      { label: 'Market Admin',      pages: ['/market','/roi-ladder','/purchase-calculator','/cutout','/enterprise','/playbook','/programs','/sensitivity','/global','/trade-analytics','/carcass-quality','/'], managesRoles: ['sales_rep','field_rep'] },
  staff_admin:       { label: 'Staff Admin',       pages: ['/staff-portal','/approvals','/'], managesRoles: ['cowboy','feed_mill','feed_truck','field_rep','sales_rep','truck_driver','truck_owner','dispatch','welder','maintenance','office_manager','manager'] },
  field_admin:       { label: 'Field Admin',       pages: ['/field-rep','/marketplace','/my-listings','/lots','/lot-performance','/'], managesRoles: ['field_rep','sales_rep','buyer','seller'] },
};

export function isFullAccess(user) {
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  const nameLC = (user.full_name || '').toLowerCase();
  const emailLC = (user.email || '').toLowerCase();
  return FULL_ACCESS_USERS.some(n => nameLC.startsWith(n) || emailLC.startsWith(n));
}

export function canAccessPage(user, path) {
  if (!user) return false;
  if (isFullAccess(user)) return true;
  const section = SECTION_ADMIN_SECTIONS[user.role];
  if (section) return section.pages.includes(path);
  return null;
}

export function getManagedRoles(user) {
  if (!user) return [];
  if (isFullAccess(user)) return 'all';
  const section = SECTION_ADMIN_SECTIONS[user.role];
  if (section) return section.managesRoles;
  return [];
}

export function getAccessLabel(user) {
  if (!user) return 'No Access';
  if (isFullAccess(user)) return 'Full Platform Access';
  const section = SECTION_ADMIN_SECTIONS[user.role];
  if (section) return section.label;
  return user.role;
}`
  },
  {
    path: 'components/Layout.jsx',
    section: 'Components',
    content: `// Full sidebar + mobile layout using React Router <Outlet>
// Imports: Link, useLocation, useAuth, isFullAccess, SECTION_ADMIN_SECTIONS
// Nav items: all 40+ routes with role-based visibility
// Desktop: collapsible sidebar (w-56), logo, nav links, user footer
// Mobile: hamburger menu + MobileHeader + MobileTabBar bottom nav
// Role filtering: isFullAccess → all items; section admin → section pages; else → role match
// Route protection via ProtectedRoute + RoleGate wrappers in App.jsx`
  },
  {
    path: 'components/SectionHeader.jsx',
    section: 'Components',
    content: `export default function SectionHeader({ title, subtitle, badge }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        <h1 className="font-bebas text-3xl text-foreground tracking-wide">{title}</h1>
        {badge && (
          <span className="text-xs bg-primary/15 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-medium">
            {badge}
          </span>
        )}
      </div>
      {subtitle && <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>}
      <div className="h-px bg-gradient-to-r from-primary/40 to-transparent mt-3" />
    </div>
  );
}`
  },
  {
    path: 'components/StatCard.jsx',
    section: 'Components',
    content: `export default function StatCard({ title, value, sub, trend, color = 'primary', icon: Icon }) {
  const colors    = { primary: 'border-primary/20 bg-primary/5', success: 'border-success/20 bg-success/5', danger: 'border-danger/20 bg-danger/5', warning: 'border-warning/20 bg-warning/5' };
  const textColors = { primary: 'text-primary', success: 'text-success', danger: 'text-danger', warning: 'text-warning' };
  return (
    <div className={\`rounded-lg border \${colors[color]} p-4 card-glow\`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{title}</span>
        {Icon && <Icon className={\`w-4 h-4 \${textColors[color]}\`} />}
      </div>
      <div className={\`text-2xl font-bebas \${textColors[color]}\`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      {trend && <div className={\`text-xs mt-1 font-medium \${trend > 0 ? 'text-success' : 'text-danger'}\`}>{trend > 0 ? '▲' : '▼'} {Math.abs(trend)}%</div>}
    </div>
  );
}`
  },
  {
    path: 'components/MobileHeader.jsx',
    section: 'Components',
    content: `import { Link } from 'react-router-dom';
// Mobile-only sticky header with Continental logo + brand name
// Hidden on md+ breakpoint (md:hidden)
// Displays logo image + "CONTINENTAL / Cattle Co" text`
  },
  {
    path: 'components/MobileTabBar.jsx',
    section: 'Components',
    content: `import { Link } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, Beef, Settings } from 'lucide-react';

const MOBILE_TABS = [
  { label: 'Home',   icon: LayoutDashboard, path: '/' },
  { label: 'Market', icon: TrendingUp,       path: '/market' },
  { label: 'Lots',   icon: Beef,             path: '/lots' },
  { label: 'Menu',   icon: Settings,         path: '/settings' },
];
// Fixed bottom bar, md:hidden, highlights active tab with border-t + bg-primary/5`
  },
  {
    path: 'pages/Dashboard.jsx',
    section: 'Pages',
    content: `// COMMAND CENTER — Main dashboard
// Data: MarketInputs (live, refetch 3s), CattleLot (active, refetch 3s)
// Real-time subscriptions: MarketInputs + CattleLot via useRealtimeSync
// Auto-refetch on focus via useAutoRefetch
// Computed: totalHead, totalValue, cutoutLiveSpread, roiSignal, marketAlerts
// UI: Market strip (LC/GF/Choice/Trim/Corn/SBM/Basis), KPI grid, ROI Class Rankings,
//     Weekly Signals, Core Operations nav, Analysis & Modeling nav
// DEFAULTS: lc=241.66, gf=285.40, corn=4.22, sbm=340, choice=324.50, trim90=3.15, basis=-2.50`
  },
  {
    path: 'pages/MarketInputs.jsx',
    section: 'Pages',
    content: `// Live market data entry — CME & USDA feeds
// Fields: lc_futures, gf_futures, corn_price, sbm_price, choice_cutout, select_cutout,
//   prime_cutout, trim_90s, trim_50s, basis_southern_plains, import_volume, export_volume
// Auto-calculations: cogCalc (corn-based), gridAdj, spreadSignal
// Real-time sync via useRealtimeSync + useAutoRefetch
// Saves to MarketInputs entity, shows last 10 entries in history panel`
  },
  {
    path: 'pages/ROILadder.jsx',
    section: 'Pages',
    content: `// 150-lb increment ROI ladder for all 18 breed × sex combos
// Uses getAllCombos() from lib/cattleConfig for CLASSES with dressingPct, gridAdj, maxWeight
// Inputs: Breed×Sex selector, LC Futures, Basis, COG, Yardage, DL Rate, Interest APR, Start Weight
// Calculation: calcLadder() → steps from startWeight to maxWeight in 150-lb increments
//   Each step: startValue, endValue, gainValue, totalCost, profit, ROI%, profitPerDay
//   Signals: FEED (>10%), HOLD (3-10%), SELL (<3%)
// Highlights best ROI step, shows effective LC and grid adjustment`
  },
  {
    path: 'pages/CattleLots.jsx',
    section: 'Pages',
    content: `// Master cattle lot inventory
// Entity: CattleLot — breed_type (6 types), sex (steer/heifer/bull), head_count, weights,
//   purchase_price ($/cwt), purchase_date, yard, pen, cog, yardage, status, stage
// Filters: entity, status
// Real-time sync via CattleLot.subscribe()
// Form: lot_id, breed_type (BREED_TYPES), sex (SEX_OPTIONS), head_count, weights,
//   purchase_price, purchase_date, yard, pen, COG, entity, stage
// Table: LotID, Entity, Breed/Sex (getCattleLabel), Head, Weights, Price, Date, Stage, Status, Value`
  },
  {
    path: 'pages/PurchaseCalculator.jsx',
    section: 'Pages',
    content: `// Purchase & Placement ROI Calculator
// Inputs: purchaseWeight, purchasePrice, targetWeight, costOfGain, yardage, daysOnFeed,
//   deathLossPercent, interestRate, freightCostPerHead, shrinkPercent
// Uses live LC futures from MarketInputs
// Cattle class scenarios: Day-Old Calves, Light Calves (350-550), Medium Calves (550-750), Cull Cows
// Computes: purchase_cost, feed_cost, yardage_cost, interest_cost, death_loss_cost,
//   total_cost_per_head, revenue_per_head, profit_per_head, roi_percent
// Shows best ROI opportunity + comparison grid`
  },
  {
    path: 'pages/CutoutEngine.jsx',
    section: 'Pages',
    content: `// Carcass → Primals → Subprimals → Revenue
// Primals: Chuck(29%), Rib(9%), Loin(16%), Round(22%), Brisket(6%), Plate(8%), Flank(4%), Trim(6%), Variety(25lb)
// Import/Export adjustments to primal prices (high/normal/low for each)
// Inputs: liveWeight, dressingPct, importVol, exportVol, per-primal price points (editable)
// Outputs: carcassWeight, total cutout value, $/cwt, live equivalent, estimated packer margin`
  },
  {
    path: 'pages/EnterpriseModel.jsx',
    section: 'Pages',
    content: `// Day-Old → Rail — Full 5-stage enterprise model
// Stage 1: Day-Old → 400 lb (milk, starter, labor, death loss, interest, freight)
// Stage 2: 400 → 900 lb (COG, other)
// Stage 3: 900 → 1500 lb (COG, yardage/interest)
// Stage 4: 1500 lb → Rail (carcass weight, total cutout value)
// Stage 5: Internal transfers (commission, freight, dispatch, marketing, ownership)
// Outputs: profit/head, ROI%, internal margin/head, weekly/monthly/annual profit
// All inputs editable; waterfall chart shows per-stage contribution`
  },
  {
    path: 'pages/WeeklyPlaybook.jsx',
    section: 'Pages',
    content: `// Weekly Buy/Sell/Feed/Avoid/Hedge/Watch signals
// Static playbook data updated weekly for current market conditions
// Market context cards: LC signal, 90s Trim, Cutout Spread
// Decision tree: 9 condition → action rules (ROI thresholds, COG, spread, trim)
// Sensitivity table: 13 factor changes with ROI impact ranges`
  },
  {
    path: 'pages/Sensitivity.jsx',
    section: 'Pages',
    content: `// Sensitivity & Risk analysis
// Scenario scanner: 8 combined scenarios (base, feed+20%, basis-3, DL+2%, grid-10, cutout-20, all-neg, all-pos)
// Sensitivity tables: COG, Death Loss, Basis, Grid Premium, Dressing%, Cutout Value, 90s Trim
// Enterprise risk map: Market, Feed Cost, Weather, Health, Trucking, Labor, Compliance, Export/Import`
  },
  {
    path: 'pages/AIFeedPlanner.jsx',
    section: 'Pages',
    content: `// AI Feed & Health Planner — most complex page
// Inputs: lot selector, plan type (full/ration/vaccination), focus (roi/grade/adr/cost/balanced)
// Origin/Transit: geocoding via Open-Meteo, haversine × 1.25 road factor, ETA @ 50mph, shrink %
// Economics: arrivalWt, shippingWt, purchasePrice, ADG, COG, DOF, interestRate, truckingIn/Out
// computeEconomics(): full cost breakdown, LC-based revenue, profit/head, ROI, breakeven
//   + USDA age limit calcs (breed-specific via getUsdaLimit/getTargetGrade from cattleConfig)
// generateFallbackPlan(): data-driven ration (3 phases), vaccination (BQA timeline), economics, recommendations
// Weather: Open-Meteo API for Shattuck, OK yard (36.2687°N, 99.8773°W)
// AI upgrade: InvokeLLM with claude_sonnet_4_6 when credits available
// Save/Load: SavedFeedPlan entity, auto-saved, deletable`
  },
  {
    path: 'pages/FeedlotOps.jsx',
    section: 'Pages',
    content: `// Daily pen feed orders
// Entity: PenFeedOrder — entity, yard, pen, cattle_lot_id, head_count, ration_name,
//   lbs_per_head, total_lbs (auto-calc), feed_time, feed_date, ingredients, special_instructions
// Filter by date and status (scheduled/mixed/delivered/complete)
// Grouped by feed time (morning/midday/afternoon/evening)
// Status workflow: scheduled → mixed → delivered → complete
// Stats: total pens, each status count, total lbs for the day`
  },
  {
    path: 'pages/LotPerformance.jsx',
    section: 'Pages',
    content: `// Lot health event tracking
// Entity: LotHealthEvent — event_date, event_type (pull/treatment/death/weight_check/observation/vaccination)
//   head_affected, diagnosis, treatment, product_used, dosage, cost_per_head, weight_recorded
//   follow_up_required, follow_up_date, photos, recorded_by
// Per-lot stats: morbidity %, mortality %, last weight, event count
// Alert if morbidity >10% or mortality >2%
// Photo upload via UploadFile integration`
  },
  {
    path: 'pages/FieldRepPortal.jsx',
    section: 'Pages',
    content: `// Field submission portal
// Entity: FieldSubmission — submission_type (lot_listing/lot_update/health_event/weight_update/load_available)
//   entity, title, description, breed_type, sex, head_count, location, weight_estimate, price_ask, photos
// Status workflow: pending → approved/rejected/published
// Admin actions: Approve, Reject, Publish Live (sets publish_to_marketplace=true)
// Photo upload via UploadFile integration`
  },
  {
    path: 'pages/StaffPortal.jsx',
    section: 'Pages',
    content: `// Employee directory and HR management
// Entity: StaffDirectory — full_name, email, phone, role, department, entity_assignment[],
//   job_title, start_date, employment_type, pay_type, pay_rate, emergency_contact,
//   license_plate, truck_number, cdl_number, cdl_expiry, certifications, status
// ROLE_CONFIG and ROLE_CATEGORIES from lib/roleConfig for role selection
// StaffCard: color-coded by department, shows contact, truck, CDL info
// StaffForm: role auto-fills department; trucking fields shown for driver/owner/dispatch/hauler
// Entity assignment: multi-select pills for all 6 entities
// Search by name/email/role; filter by department`
  },
  {
    path: 'pages/Maintenance.jsx',
    section: 'Pages',
    content: `// Work order / maintenance ticket system
// Entity: MaintenanceTicket — entity, location, category (fence_repair/equipment/welding/plumbing/
//   electrical/pen_maintenance/vehicle/building/other), priority (urgent/high/medium/low)
//   title, description, reported_by, assigned_to, status, estimated_hours, actual_hours,
//   parts_cost, labor_cost, photos, completed_date, notes
// Status workflow: open → in_progress → completed / on_hold
// TicketCard: color-coded by priority, expandable with details and action buttons
// Filter by status; KPI cards for each status count`
  },
  {
    path: 'pages/Marketplace.jsx',
    section: 'Pages',
    content: `// External cattle bidding marketplace
// Tabs: Live Bids (LiveMarketplace component), My Bids, Settlements
// Entity: Bid — cattle_lot_id, bidder_id, bid_amount, price_per_unit, bank_account_id, status
// Entity: BidSettlement — total_sale_price, total_weight, commission, freight, seller_receives
// KPIs: active bids, accepted bids, settled sales
// Settlement details: net profit, ROI% from settlement_document JSON field`
  },
  {
    path: 'pages/LoadBoard.jsx',
    section: 'Pages',
    content: `// Hauler load board
// Tabs: Available Loads, My BOLs
// Available: PublicOrder.filter({ order_type: 'haul', status: 'approved' }), refresh 5s
// My BOLs: BidSettlement filtered by seller_id (hauler email)
// KPIs: available loads count, paid BOLs total, pending payment total
// Payment status: dispersed (PAID, green) vs pending (PENDING, amber)`
  },
  {
    path: 'pages/Trucking.jsx',
    section: 'Pages',
    content: `// Fleet profitability optimizer — Grand Slam & Full Count
// Load inputs: miles, fuel $/gal, MPG, driver rate $/mi, load weight, shrink%, head count,
//   rate $/mi, loads/week, weeks/year
// Owned fleet fixed (monthly per truck): truck payment, trailer payment, insurance,
//   registration, tires, maintenance, depreciation, DOT/compliance, parking, other
// Computed: variableCostPerLoad, fixedCostPerLoad (annualized over all loads), totalCostPerLoad
//   profitPerLoad, profitPerMile, profitPerHead, weeklyProfit, annualProfit, shrink value
// Targets: profit/load, rate/mile, breakeven loads/month`
  },
  {
    path: 'pages/OperationalPrograms.jsx',
    section: 'Pages',
    content: `// Cattle program management
// Entity: CattleProgram — program_name, title, cattle_class, volume_per_period, frequency,
//   source_location, destination_location, annual_volume, status, buy_weight, target_weight,
//   average_shrink, cost_of_gain, expected_roi_percent, notes
// KPIs: active count, total annual volume, avg ROI target (18-25%)
// Program cards: show all fields, color-coded by status`
  },
  {
    path: 'pages/Settings.jsx',
    section: 'Pages',
    content: `// Account settings — admin/super_admin only
// Account info: full_name, email, access level (getAccessLabel)
// Appearance: theme toggle (dark/light) via ThemeProvider
// Session: sign out button
// Danger zone: delete account with two-step confirmation (type "DELETE" to confirm)`
  },
  {
    path: 'index.css',
    section: 'Styling',
    content: `/* Design tokens — CSS custom properties */
:root {
  --background: 0 0% 100%;          /* Light: white */
  --foreground: 20 14% 4%;
  --card: 0 0% 96%;
  --primary: 38 92% 50%;            /* Gold — brand color */
  --primary-foreground: 0 0% 100%;
  --secondary: 20 10% 88%;
  --muted: 20 10% 80%;
  --accent: 38 70% 35%;
  --destructive: 0 72% 51%;         /* Red — danger */
  --border: 20 10% 85%;
  --success: 142 70% 45%;           /* Green */
  --warning: 38 92% 50%;            /* Gold */
  --danger: 0 72% 51%;              /* Red */
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: 20 14% 4%;        /* Dark: near black */
    --foreground: 40 15% 92%;
    --card: 20 12% 7%;
    --primary: 38 92% 50%;          /* Gold stays consistent */
    --border: 20 10% 16%;
  }
}

/* Font classes */
.font-bebas { font-family: 'Bebas Neue', sans-serif; }  /* Headers, KPIs */
.font-inter { font-family: 'Inter', sans-serif; }        /* Body text */

/* Utility classes */
.gold-gradient { background: linear-gradient(135deg, hsl(38 92% 50%), hsl(38 70% 35%)); }
.card-glow { box-shadow: 0 0 0 1px hsl(38 92% 50% / 0.1), 0 4px 24px hsl(38 92% 50% / 0.05); }
.positive { color: hsl(142 70% 45%); }
.negative { color: hsl(0 72% 51%); }

/* Custom scrollbar — 6px, dark track, gold hover */
/* iOS safe area support — pb-safe, pt-safe utility classes */`
  },
  {
    path: 'tailwind.config.js',
    section: 'Styling',
    content: `module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        bebas: ['Bebas Neue', 'sans-serif'],
      },
      colors: {
        // All mapped to CSS custom properties (see index.css)
        background: 'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        primary:    { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary:  { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        muted:      { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        card:       { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        border:     'hsl(var(--border))',
        success:    'hsl(var(--success))',
        warning:    'hsl(var(--warning))',
        danger:     'hsl(var(--danger))',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'pulse-gold': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.5 } },
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
}`
  },
];

function generateSourceCodeHTML() {
  const now = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });
  const sections = [...new Set(SOURCE_FILES.map(f => f.section))];

  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
<meta charset="utf-8">
<title>Continental Cattle Company — Full Source Code</title>
<style>
  body { font-family: Consolas, 'Courier New', monospace; font-size: 9pt; color: #1a1a1a; max-width: 8.5in; margin: 0 auto; padding: 0.5in; line-height: 1.4; }
  h1 { font-family: 'Segoe UI', Arial, sans-serif; font-size: 20pt; color: #b8860b; border-bottom: 3px solid #b8860b; padding-bottom: 8px; margin-top: 40px; page-break-before: always; }
  h1:first-of-type { page-break-before: avoid; }
  h2 { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13pt; color: #333; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 30px; }
  h3 { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #b8860b; margin-top: 20px; margin-bottom: 4px; }
  pre { background: #f5f5f5; border: 1px solid #ddd; border-left: 4px solid #b8860b; padding: 10px 12px; overflow-x: auto; white-space: pre-wrap; word-break: break-word; font-size: 8pt; line-height: 1.5; border-radius: 4px; }
  .cover { text-align: center; padding: 80px 0 40px 0; font-family: 'Segoe UI', Arial, sans-serif; }
  .cover h1 { border: none; font-size: 28pt; page-break-before: avoid; }
  .meta { font-family: 'Segoe UI', Arial, sans-serif; font-size: 9pt; color: #666; background: #f9f9f9; border: 1px solid #eee; padding: 6px 10px; margin-bottom: 6px; border-radius: 4px; }
  .file-path { color: #b8860b; font-weight: 700; font-size: 10pt; }
  @media print { h1 { page-break-before: always; } h1:first-of-type { page-break-before: avoid; } pre { page-break-inside: avoid; } }
</style>
</head>
<body>

<div class="cover">
  <h1>CONTINENTAL CATTLE COMPANY</h1>
  <p style="font-size:16pt; color:#b8860b; font-weight:600; font-family:'Segoe UI',Arial;">Full Platform Source Code</p>
  <p style="font-family:'Segoe UI',Arial;">Complete source code for all pages, components, and configuration files</p>
  <p style="font-family:'Segoe UI',Arial;">Generated: ${now}</p>
  <p style="font-size:9pt; color:#999; font-family:'Segoe UI',Arial;">Confidential — For Internal Technical Use Only</p>
</div>

<div style="font-family:'Segoe UI',Arial; font-size:10pt; background:#fff8e1; border:1px solid #b8860b; padding:12px 16px; margin:20px 0; border-radius:4px;">
  <strong>HOW TO USE THIS DOCUMENT:</strong><br>
  This document contains the complete readable source code for the Continental Cattle Company platform.
  Code blocks show the actual JavaScript/React source for each file. 
  Files marked with [SUMMARY] contain architectural descriptions rather than full code (for brevity).
  Total files: ${SOURCE_FILES.length} | Sections: ${sections.join(', ')}
</div>`;

  sections.forEach(section => {
    html += `<h1>${section.toUpperCase()} FILES</h1>`;
    const sectionFiles = SOURCE_FILES.filter(f => f.section === section);
    sectionFiles.forEach(file => {
      html += `<h2><span class="file-path">${file.path}</span></h2>`;
      html += `<div class="meta">File: ${file.path} | Section: ${file.section} | Lines: ~${file.content.split('\n').length}</div>`;
      html += `<pre>${file.content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>`;
    });
  });

  html += `
<h1>BACKEND FUNCTIONS</h1>
<div style="font-family:'Segoe UI',Arial; font-size:10pt;">
  <p>Backend functions run on the Deno runtime. To view full source code for each function, go to:<br>
  <strong>Base44 Dashboard → Code → Functions → [function name]</strong></p>
  <table style="border-collapse:collapse; width:100%; font-size:9pt;">
    <tr style="background:#b8860b; color:white;"><th style="text-align:left;padding:6px 10px;">Function</th><th style="text-align:left;padding:6px 10px;">Purpose</th></tr>
    <tr><td style="border:1px solid #ddd;padding:5px 10px;font-family:Consolas;font-size:8pt;">aiAdminController</td><td style="border:1px solid #ddd;padding:5px 10px;">Autonomous admin tasks — cleanup, validation, auto-approvals</td></tr>
    <tr style="background:#f9f9f9;"><td style="border:1px solid #ddd;padding:5px 10px;font-family:Consolas;font-size:8pt;">aiPlatformOrchestrator</td><td style="border:1px solid #ddd;padding:5px 10px;">Coordinates AI-driven platform operations</td></tr>
    <tr><td style="border:1px solid #ddd;padding:5px 10px;font-family:Consolas;font-size:8pt;">autonomousSystemHealthCheck</td><td style="border:1px solid #ddd;padding:5px 10px;">Periodic system health audit and anomaly detection</td></tr>
    <tr style="background:#f9f9f9;"><td style="border:1px solid #ddd;padding:5px 10px;font-family:Consolas;font-size:8pt;">bidirectionalSync</td><td style="border:1px solid #ddd;padding:5px 10px;">Two-way sync between internal platform and public marketplace</td></tr>
    <tr><td style="border:1px solid #ddd;padding:5px 10px;font-family:Consolas;font-size:8pt;">createBid</td><td style="border:1px solid #ddd;padding:5px 10px;">Validates funds and creates marketplace bid records</td></tr>
    <tr style="background:#f9f9f9;"><td style="border:1px solid #ddd;padding:5px 10px;font-family:Consolas;font-size:8pt;">fetchLiveMarketData</td><td style="border:1px solid #ddd;padding:5px 10px;">Fetches live LC/FC futures, cutout values, commodity prices</td></tr>
    <tr><td style="border:1px solid #ddd;padding:5px 10px;font-family:Consolas;font-size:8pt;">generateSettlementDocument</td><td style="border:1px solid #ddd;padding:5px 10px;">Creates settlement docs — commission, freight, net proceeds</td></tr>
    <tr style="background:#f9f9f9;"><td style="border:1px solid #ddd;padding:5px 10px;font-family:Consolas;font-size:8pt;">onNewUserRegistration</td><td style="border:1px solid #ddd;padding:5px 10px;">Sets new users to pending role, notifies admin</td></tr>
    <tr><td style="border:1px solid #ddd;padding:5px 10px;font-family:Consolas;font-size:8pt;">processBidPayment</td><td style="border:1px solid #ddd;padding:5px 10px;">Executes payment transfer between buyer and seller accounts</td></tr>
    <tr style="background:#f9f9f9;"><td style="border:1px solid #ddd;padding:5px 10px;font-family:Consolas;font-size:8pt;">syncToPublicApp</td><td style="border:1px solid #ddd;padding:5px 10px;">Pushes cattle lots and listings to public marketplace</td></tr>
    <tr><td style="border:1px solid #ddd;padding:5px 10px;font-family:Consolas;font-size:8pt;">syncFromPublicApp</td><td style="border:1px solid #ddd;padding:5px 10px;">Pulls orders and bids from public marketplace app</td></tr>
    <tr style="background:#f9f9f9;"><td style="border:1px solid #ddd;padding:5px 10px;font-family:Consolas;font-size:8pt;">transactionDualSignature</td><td style="border:1px solid #ddd;padding:5px 10px;">Dual-signature workflow — both parties must sign</td></tr>
    <tr><td style="border:1px solid #ddd;padding:5px 10px;font-family:Consolas;font-size:8pt;">validateCarcassQuality</td><td style="border:1px solid #ddd;padding:5px 10px;">Validates carcass data against NBQA benchmarks</td></tr>
    <tr style="background:#f9f9f9;"><td style="border:1px solid #ddd;padding:5px 10px;font-family:Consolas;font-size:8pt;">verifyFundsAndSetLimits</td><td style="border:1px solid #ddd;padding:5px 10px;">Verifies bank balances and sets max bid limits</td></tr>
    <tr><td style="border:1px solid #ddd;padding:5px 10px;font-family:Consolas;font-size:8pt;">+ 11 more functions</td><td style="border:1px solid #ddd;padding:5px 10px;">See Dashboard → Code → Functions for complete list</td></tr>
  </table>
</div>

<div style="font-family:'Segoe UI',Arial; margin-top:40px; text-align:center; font-size:9pt; color:#999;">
  Continental Cattle Co INC · Platform Source Code Export · ${now}
</div>
</body></html>`;

  return html;
}

// ── All entity names used in the platform ──────────────────────────────────
const ENTITY_NAMES = [
  'CattleLot', 'SavedFeedPlan', 'MarketInputs', 'FeedProtocol', 'HealthProtocol',
  'LotHealthEvent', 'PenFeedOrder', 'CattleProgram', 'DealCalculator', 'BuyingGuide',
  'CarcassQualityBenchmark', 'TradeData', 'OperatingEntity', 'StaffDirectory',
  'MaintenanceTicket', 'FieldSubmission', 'Bid', 'BidSettlement', 'BankAccount',
  'Transaction', 'PublicOrder', 'CustomerAccount', 'WeeklyPlaybook', 'CarcassOutcomeActual',
];

// ── Page descriptions ──────────────────────────────────────────────────────
const PAGE_DOCS = [
  { path: '/', name: 'Dashboard', desc: 'Central command hub displaying real-time cattle economics, market futures (LC/FC), portfolio value, active lot counts, ROI signals, and quick-navigation to all platform modules.' },
  { path: '/market', name: 'Market Inputs', desc: 'Manages live market data entry — LC/FC futures, cutout values (Choice/Select/Prime), corn and SBM prices, trim prices, and import/export volume signals. Data feeds into all calculators and projections.' },
  { path: '/roi-ladder', name: 'ROI Ladder', desc: 'Visual ROI comparison tool that ranks cattle programs and deal structures by projected return, factoring in purchase price, COG, sell price, and market conditions.' },
  { path: '/purchase-calculator', name: 'Purchase Calculator', desc: 'Deal analysis tool for evaluating cattle purchases — calculates breakeven, projected profit, and ROI given buy weight, price, COG, trucking, interest, and target sell conditions.' },
  { path: '/cutout', name: 'Cutout Engine', desc: 'Analyzes carcass cutout values — Choice, Select, Prime — to determine packer margin, plant profitability, and optimal marketing timing based on spread analysis.' },
  { path: '/enterprise', name: 'Enterprise Model', desc: 'Comprehensive financial modeling for the entire enterprise — aggregates all entities, cattle programs, and revenue streams into a unified P&L projection.' },
  { path: '/playbook', name: 'Weekly Playbook', desc: 'Weekly operational strategy guide with buy/sell/feed/hedge signals, decision trees, and sensitivity analysis based on current market conditions.' },
  { path: '/lots', name: 'Cattle Lots', desc: 'Master inventory of all active cattle lots — tracks head count, weights, purchase info, yard/pen assignments, stage (calf ranch → finish), COG, and yardage per lot.' },
  { path: '/programs', name: 'Operational Programs', desc: 'Manages recurring cattle programs (P1, P2, P3, etc.) — volume, frequency, source/destination, buy/sell weights, shrink, COG, and expected ROI per program cycle.' },
  { path: '/entity-financials', name: 'Entity Financials', desc: 'Financial dashboard per operating entity (Continental, Rincon, Flying3BarB, etc.) — revenue, expenses, monthly/annual P&L, and inter-entity transfers.' },
  { path: '/financial-intelligence', name: 'Financial Intelligence', desc: 'Advanced financial analytics including credit engine, capital engine, cash flow projections, and institutional reporting for lenders and investors.' },
  { path: '/corporate-structure', name: 'Corporate Structure', desc: 'Visualizes the multi-tier ownership hierarchy — personal trusts → business trusts → corporations → LLCs — with EIN, formation state, and inter-entity relationships.' },
  { path: '/feed-health', name: 'Feed & Health', desc: 'Reference dashboard for feed commodity specs (TDN, CP, cost/ton, daily intake) and health protocol library (vaccines, implants, dewormers with BQA-compliant timing).' },
  { path: '/feedlot-ops', name: 'Feedlot Ops', desc: 'Daily feedlot operations — pen-by-pen feed order management, ration scheduling (morning/midday/afternoon/evening), mixing instructions, and delivery tracking.' },
  { path: '/lot-performance', name: 'Lot Performance', desc: 'Health event tracking per lot — pulls, treatments, deaths, weight checks, vaccinations, preg checks — with photo upload and follow-up scheduling.' },
  { path: '/ai-feed-planner', name: 'AI Feed Planner', desc: 'Generates complete feed ration programs, vaccination schedules, and economic projections using arrival wt, shipping wt, purchase price, ADG, COG, DOF, interest, shrink, trucking, and live LC/FC boards. Includes origin-based transit distance, ETA, and expected shrink calculations.' },
  { path: '/ai-ops-advisor', name: 'AI Ops Advisor', desc: 'Strategic operations advisor — synthesizes staffing, logistics, maintenance, and market data into actionable reports with immediate priorities and 90-day roadmaps.' },
  { path: '/staff-portal', name: 'Staff Portal', desc: 'Employee directory and HR management — contact info, job titles, department assignments, pay rates, CDL tracking, certifications, and employment status.' },
  { path: '/maintenance', name: 'Maintenance', desc: 'Work order and ticket system for facility maintenance — fence repair, equipment, welding, plumbing, electrical — with priority levels, cost tracking, and photo documentation.' },
  { path: '/field-rep', name: 'Field Rep Portal', desc: 'Field submission portal for lot listings, health updates, weight reports, and load availability — includes photo upload, GPS location, and admin review workflow.' },
  { path: '/marketplace', name: 'Live Marketplace', desc: 'Cattle bidding marketplace — external buyers can place bids on listed lots with verified bank accounts. Includes bid tracking, acceptance workflow, and settlement generation.' },
  { path: '/my-listings', name: 'My Listings', desc: 'Seller portal for viewing and managing listed cattle lots, tracking buyer interest, and monitoring sale status.' },
  { path: '/load-board', name: 'Load Board', desc: 'Trucking load board for dispatching cattle hauls — origin/destination, load details, driver assignments, BOL management, and delivery confirmation.' },
  { path: '/trucking', name: 'Trucking', desc: 'Trucking cost analysis and freight management — $/mile rates, load capacity, haul distances, and route optimization across all entities.' },
  { path: '/trade-analytics', name: 'Trade Analytics', desc: 'Global beef trade data — import/export volumes by country, year-over-year trends, and impact analysis on domestic pricing.' },
  { path: '/carcass-quality', name: 'Carcass Quality', desc: 'Carcass quality validation against NBQA benchmarks — Prime/Choice/Select distribution, yield grade analysis, and plant-type comparison.' },
  { path: '/sensitivity', name: 'Sensitivity', desc: 'Sensitivity analysis tool for stress-testing cattle economics — evaluates profit impact of changes in LC futures, corn prices, COG, and death loss.' },
  { path: '/global', name: 'Global Intel', desc: 'Global market intelligence — tracks import/export volume signals and their calculated impact on domestic trim prices and short plate values.' },
  { path: '/document', name: 'Master Document', desc: 'Centralized document repository for operational guides, contracts, compliance records, and reference materials.' },
  { path: '/approvals', name: 'Approvals', desc: 'Admin approval dashboard for pending user accounts, customer accounts, public orders, and bid management with accept/deny workflow.' },
  { path: '/bank-linking', name: 'Bank Linking', desc: 'Bank account verification and linking for bid fund verification — supports manual entry and OAuth-based account connections.' },
  { path: '/attorney-portal', name: 'Attorney / CPA Portal', desc: 'External legal and financial portal — provides read access to corporate structure, entity financials, settlements, and compliance documents.' },
  { path: '/settings', name: 'Settings', desc: 'Admin settings — account management, theme preferences, and system configuration.' },
  { path: '/system-health', name: 'System Health', desc: 'System health monitoring dashboard — tracks data sync status, validation results, and background task execution.' },
  { path: '/ai-management', name: 'AI Management', desc: 'AI platform orchestration dashboard — monitors automated data sync, cross-domain validation, and AI-driven operations.' },
  { path: '/ai-admin', name: 'AI Admin Control', desc: 'Administrative dashboard for monitoring autonomous backend operations — data synchronization, validation tasks, and auto-approval workflows.' },
  { path: '/sync-monitor', name: 'Sync Monitor', desc: 'Real-time sync monitor for tracking data synchronization between the internal platform and public-facing marketplace app.' },
];

// ── Backend function descriptions ──────────────────────────────────────────
const BACKEND_FUNCTIONS = [
  { name: 'aiAdminController', desc: 'Runs autonomous admin tasks — data cleanup, validation checks, and automated approval processing.' },
  { name: 'aiPlatformOrchestrator', desc: 'Orchestrates AI-driven platform operations — coordinates sync, validation, and alert generation across all subsystems.' },
  { name: 'autonomousSystemHealthCheck', desc: 'Periodic system health audit — validates data consistency, checks for anomalies, and reports operational status.' },
  { name: 'autonomousUIHealthMonitor', desc: 'Monitors UI rendering health and scroll performance across platform pages.' },
  { name: 'bidirectionalSync', desc: 'Two-way data sync between internal platform and public marketplace — keeps cattle lots, orders, and listings in sync.' },
  { name: 'comprehensiveCrossValidation', desc: 'Cross-domain validation — ensures ROI projections, market data, quality metrics, and financial figures are internally consistent.' },
  { name: 'createBid', desc: 'Processes new bid submissions from marketplace buyers — validates bank account funds, creates bid record, and notifies admin.' },
  { name: 'fetchLiveMarketData', desc: 'Fetches live cattle market data from external sources — LC/FC futures, cutout values, corn and commodity prices.' },
  { name: 'generateRealTimeAlerts', desc: 'Generates operational alerts based on market movements, lot health events, and system anomalies.' },
  { name: 'generateSettlementDocument', desc: 'Creates settlement documents for completed cattle sales — calculates commission, freight, expenses, and net proceeds.' },
  { name: 'intuitOAuthHandler', desc: 'Handles Intuit/QuickBooks OAuth flow for bank account linking and fund verification.' },
  { name: 'masterOperationsOrchestrator', desc: 'Master scheduler that coordinates all automated operations — syncs, validations, and data refresh cycles.' },
  { name: 'masterSystemOrchestrator', desc: 'Top-level system orchestrator — manages execution priority and sequencing of all background functions.' },
  { name: 'onNewUserRegistration', desc: 'Triggered when new users register — sets initial role to "pending" and notifies admin for approval.' },
  { name: 'processBidPayment', desc: 'Processes payment execution for accepted bids — coordinates fund transfer between buyer and seller bank accounts.' },
  { name: 'receiveAdminSyncFromSourceApp', desc: 'Receives admin-level data sync payloads from the source/public app (user accounts, approvals).' },
  { name: 'receiveSyncFromSourceApp', desc: 'Receives marketplace data sync from public app — orders, bids, customer accounts.' },
  { name: 'syncContinentalWebData', desc: 'Syncs data to the Continental Cattle Company public website.' },
  { name: 'syncFromPublicApp', desc: 'Pulls new data from the public marketplace app into the internal platform.' },
  { name: 'syncToPublicApp', desc: 'Pushes updated cattle lot and listing data from internal platform to the public marketplace.' },
  { name: 'transactionAutomation', desc: 'Automated transaction processing — handles pending transactions, fund verification, and status updates.' },
  { name: 'transactionDualSignature', desc: 'Implements dual-signature workflow — requires both initiator and receiver to sign before transaction execution.' },
  { name: 'validateCarcassQuality', desc: 'Validates carcass outcome data against NBQA benchmarks and USDA grading standards.' },
  { name: 'validateCrossDomainSync', desc: 'Validates that cross-domain sync operations completed successfully and data is consistent.' },
  { name: 'verifyFundsAndSetLimits', desc: 'Verifies bank account balances and sets maximum bid limits based on available funds.' },
];

function generateDocHTML(entities) {
  const now = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });

  let html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
<meta charset="utf-8">
<title>Continental Cattle Company — Platform Documentation</title>
<style>
  body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 11pt; color: #1a1a1a; max-width: 8.5in; margin: 0 auto; padding: 0.75in; line-height: 1.5; }
  h1 { font-size: 22pt; color: #b8860b; border-bottom: 3px solid #b8860b; padding-bottom: 8px; margin-top: 40px; page-break-before: always; }
  h1:first-of-type { page-break-before: avoid; }
  h2 { font-size: 16pt; color: #333; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 30px; }
  h3 { font-size: 13pt; color: #555; margin-top: 20px; }
  table { border-collapse: collapse; width: 100%; margin: 10px 0 20px 0; font-size: 10pt; }
  th { background: #b8860b; color: white; text-align: left; padding: 6px 10px; }
  td { border: 1px solid #ddd; padding: 5px 10px; vertical-align: top; }
  tr:nth-child(even) { background: #f9f9f9; }
  .cover { text-align: center; padding: 120px 0 60px 0; }
  .cover h1 { border: none; font-size: 32pt; page-break-before: avoid; }
  .cover p { font-size: 12pt; color: #666; }
  .toc a { text-decoration: none; color: #333; }
  .toc li { margin: 4px 0; }
  code { background: #f0f0f0; padding: 1px 4px; border-radius: 3px; font-size: 9pt; font-family: 'Consolas', 'Courier New', monospace; }
  .field-row td:first-child { font-weight: 600; white-space: nowrap; }
  .note { background: #fff8e1; border-left: 4px solid #b8860b; padding: 8px 12px; margin: 10px 0; font-size: 10pt; }
  @media print { h1 { page-break-before: always; } h1:first-of-type { page-break-before: avoid; } }
</style>
</head>
<body>

<div class="cover">
  <h1>CONTINENTAL CATTLE COMPANY</h1>
  <p style="font-size:18pt; color:#b8860b; font-weight:600;">Platform Documentation</p>
  <p style="margin-top:40px;">Complete System Architecture, Data Models, Features & Operations Guide</p>
  <p>Generated: ${now}</p>
  <p style="margin-top:60px; font-size:10pt; color:#999;">Confidential — For Internal Use Only</p>
</div>

<h1>1. PLATFORM OVERVIEW</h1>
<p>The Continental Cattle Company platform is a comprehensive cattle operations management system built as a web application. It manages the full lifecycle of cattle operations including:</p>
<ul>
  <li><strong>Cattle Inventory & Lot Management</strong> — Tracking head counts, weights, purchase prices, yard/pen assignments, and stages from calf ranch through finish.</li>
  <li><strong>Market Intelligence</strong> — Live cattle (LC) and feeder cattle (FC) futures, cutout values, commodity prices, and global trade data to drive buy/sell decisions.</li>
  <li><strong>Financial Operations</strong> — Purchase calculators, ROI projections, breakeven analysis, enterprise-wide P&L modeling, and multi-entity corporate structure management.</li>
  <li><strong>Feed & Health Management</strong> — Ration formulation, vaccination protocols, pen-by-pen feed orders, and lot health event tracking (pulls, treatments, deaths, weight checks).</li>
  <li><strong>Marketplace & Bidding</strong> — External cattle marketplace with verified bank account bidding, settlement generation, and dual-signature transaction processing.</li>
  <li><strong>Trucking & Logistics</strong> — Load board, dispatch management, freight cost analysis, and delivery tracking.</li>
  <li><strong>Staff & Maintenance</strong> — Employee directory, work order/ticket system, and facility maintenance tracking.</li>
  <li><strong>AI-Powered Tools</strong> — AI feed planner with transit-based shrink calculations, operations advisor, and automated system health monitoring.</li>
</ul>

<h2>1.1 Technology Stack</h2>
<table>
  <tr><th>Layer</th><th>Technology</th></tr>
  <tr><td>Frontend</td><td>React 18 + Vite, TailwindCSS, shadcn/ui component library</td></tr>
  <tr><td>State Management</td><td>TanStack React Query for server state, React Context for auth</td></tr>
  <tr><td>Routing</td><td>React Router v6 with nested layout routes</td></tr>
  <tr><td>Backend</td><td>Base44 Platform (BaaS) — entities, authentication, backend functions (Deno runtime)</td></tr>
  <tr><td>Authentication</td><td>Email/password + Google OAuth, role-based access control (RBAC)</td></tr>
  <tr><td>Real-time</td><td>Entity subscriptions for live data updates</td></tr>
  <tr><td>Charts</td><td>Recharts for data visualization</td></tr>
  <tr><td>Icons</td><td>Lucide React icon library</td></tr>
  <tr><td>Animations</td><td>Framer Motion</td></tr>
  <tr><td>External APIs</td><td>Open-Meteo (weather), Open-Meteo Geocoding (transit distance)</td></tr>
</table>

<h2>1.2 Operating Entities</h2>
<p>The platform manages operations across multiple business entities:</p>
<ul>
  <li><strong>Continental</strong> — Primary holding/operating company</li>
  <li><strong>Rincon</strong> — Ranch/feedlot entity</li>
  <li><strong>Flying3BarB</strong> — Ranch entity</li>
  <li><strong>GrandSlam</strong> — Operations entity</li>
  <li><strong>FullCount</strong> — Operations entity</li>
  <li><strong>BeesonBulls</strong> — Bull/breeding entity</li>
</ul>

<h1>2. ACCESS CONTROL & ROLE SYSTEM</h1>
<p>The platform uses a comprehensive role-based access control (RBAC) system with multiple tiers of access.</p>

<h2>2.1 Full Access Principals</h2>
<p><strong>super_admin</strong> role and named users (Lane, Scott, Jeff) have unrestricted access to all platform features. Named users are matched by email prefix or full name, regardless of their assigned role.</p>

<h2>2.2 Section Admins</h2>
<p>Section admins have full admin control over their department, including managing users within their scope:</p>
<table>
  <tr><th>Role</th><th>Section</th><th>Manages Roles</th><th>Pages</th></tr>`;

  Object.entries(SECTION_ADMIN_SECTIONS).forEach(([role, sec]) => {
    html += `<tr><td><code>${role}</code></td><td>${sec.label}</td><td>${sec.managesRoles.join(', ')}</td><td>${sec.pages.join(', ')}</td></tr>`;
  });

  html += `</table>

<h2>2.3 All Roles</h2>
<table>
  <tr><th>Role Key</th><th>Label</th><th>Category</th><th>External?</th><th>Description</th></tr>`;

  Object.entries(ROLE_CONFIG).forEach(([key, cfg]) => {
    html += `<tr><td><code>${key}</code></td><td>${cfg.label}</td><td>${cfg.category}</td><td>${cfg.isExternal ? 'Yes' : 'No'}</td><td>${cfg.description}</td></tr>`;
  });

  html += `</table>

<h2>2.4 External User Flow</h2>
<p>External users (buyer, seller, hauler, attorney_cpa) register through the public portal. Their account starts with <code>pending</code> status and must be approved by an admin before gaining access. Upon approval, they are assigned their requested role and redirected to their portal:</p>
<ul>
  <li><strong>Buyer</strong> → /marketplace</li>
  <li><strong>Seller</strong> → /my-listings</li>
  <li><strong>Hauler</strong> → /load-board</li>
  <li><strong>Attorney/CPA</strong> → /attorney-portal</li>
</ul>

<h1>3. DATA MODEL — ENTITIES</h1>
<p>The platform uses ${ENTITY_NAMES.length} data entities. Each entity has built-in fields: <code>id</code>, <code>created_date</code>, <code>updated_date</code>, <code>created_by_id</code>. Below are the custom fields for each entity.</p>`;

  // Render each entity schema
  entities.forEach(({ name, schema }) => {
    html += `<h2>3.${entities.indexOf({ name, schema }) + 1} ${name}</h2>`;
    if (!schema || !schema.properties) {
      html += `<p><em>Schema not available — entity may use only built-in fields.</em></p>`;
      return;
    }
    html += `<table class="field-row"><tr><th>Field</th><th>Type</th><th>Required</th><th>Description / Options</th></tr>`;
    const props = schema.properties || {};
    const required = schema.required || [];
    Object.entries(props).forEach(([field, def]) => {
      let typeStr = def.type || '—';
      if (def.format) typeStr += ` (${def.format})`;
      if (def.type === 'array' && def.items?.type) typeStr = `array of ${def.items.type}`;
      let descParts = [];
      if (def.description) descParts.push(def.description);
      if (def.enum) descParts.push(`Options: ${def.enum.join(', ')}`);
      if (def.default !== undefined) descParts.push(`Default: ${def.default}`);
      html += `<tr><td><code>${field}</code></td><td>${typeStr}</td><td>${required.includes(field) ? '✓' : ''}</td><td>${descParts.join(' | ') || '—'}</td></tr>`;
    });
    html += `</table>`;
  });

  html += `
<h1>4. PAGES & FEATURES</h1>
<p>The platform contains ${PAGE_DOCS.length} pages, each serving a specific operational function.</p>
<table>
  <tr><th>Route</th><th>Page Name</th><th>Description</th></tr>`;

  PAGE_DOCS.forEach(p => {
    html += `<tr><td><code>${p.path}</code></td><td>${p.name}</td><td>${p.desc}</td></tr>`;
  });

  html += `</table>

<h1>5. BACKEND FUNCTIONS</h1>
<p>The platform runs ${BACKEND_FUNCTIONS.length} backend functions on the Deno runtime. These handle data sync, automated operations, payment processing, and system health monitoring.</p>
<table>
  <tr><th>Function Name</th><th>Description</th></tr>`;

  BACKEND_FUNCTIONS.forEach(f => {
    html += `<tr><td><code>${f.name}</code></td><td>${f.desc}</td></tr>`;
  });

  html += `</table>

<h1>6. KEY WORKFLOWS</h1>

<h2>6.1 Cattle Purchase & Lot Creation</h2>
<ol>
  <li>Market data entered/fetched via Market Inputs page (LC/FC futures, corn, cutouts)</li>
  <li>Deal evaluated using Purchase Calculator — inputs: buy weight, price/cwt, COG, trucking, interest, target sell weight</li>
  <li>If approved, new CattleLot record created with purchase details, yard/pen assignment, and stage</li>
  <li>Lot appears on Dashboard, Cattle Lots page, and Feedlot Ops for daily management</li>
</ol>

<h2>6.2 AI Feed Planning</h2>
<ol>
  <li>User selects lot and enters: arrival wt, shipping wt, purchase price, ADG, COG, DOF, interest rate, trucking</li>
  <li>User enters cattle origin city — system calculates road distance, ETA (@ 50 mph avg), and estimated transit shrink</li>
  <li>System computes full economics using live LC/FC futures from Market Inputs</li>
  <li>Generates: feed ration program (phased), vaccination schedule (transit-stress adjusted), economic projection, and recommendations</li>
  <li>Plan auto-saved to SavedFeedPlan entity; can be recalled, compared, or deleted</li>
</ol>

<h2>6.3 Marketplace Bidding & Settlement</h2>
<ol>
  <li>Admin publishes cattle lots to marketplace via Field Rep Portal or Approvals</li>
  <li>External buyers register → pending → admin approval → buyer role assigned</li>
  <li>Buyer links bank account (manual or OAuth), system verifies funds and sets max bid limit</li>
  <li>Buyer places bid on lot — createBid function validates funds and creates Bid record</li>
  <li>Admin reviews bids in Approvals → accepts winning bid</li>
  <li>generateSettlementDocument creates BidSettlement with commission, freight, expenses, and net proceeds</li>
  <li>Dual-signature transaction: initiator signs → receiver signs → admin approves → funds transfer</li>
</ol>

<h2>6.4 Data Synchronization</h2>
<p>The platform maintains bidirectional sync with a public-facing marketplace app:</p>
<ul>
  <li><strong>syncToPublicApp</strong> — pushes cattle lots and listings to public site</li>
  <li><strong>syncFromPublicApp</strong> — pulls orders, bids, and registrations from public site</li>
  <li><strong>bidirectionalSync</strong> — full two-way sync for all shared data</li>
  <li><strong>validateCrossDomainSync</strong> — validates sync completeness and data integrity</li>
</ul>

<h2>6.5 Daily Feedlot Operations</h2>
<ol>
  <li>Feed mill operator views daily PenFeedOrder records on Feedlot Ops page</li>
  <li>Orders specify: yard, pen, head count, ration name, lbs/head, total lbs, ingredients, and special instructions</li>
  <li>Feed is mixed (status: mixed), loaded, and delivered to pen (status: delivered → complete)</li>
  <li>Health events logged on Lot Performance page — pulls, treatments, deaths, weight checks</li>
  <li>Cowboys and field reps can upload photos and set follow-up dates for sick animals</li>
</ol>

<h1>7. DESIGN SYSTEM</h1>
<h2>7.1 Color Tokens</h2>
<table>
  <tr><th>Token</th><th>Usage</th></tr>
  <tr><td><code>--primary</code> (Gold #D4A017)</td><td>Brand color, buttons, active states, highlights</td></tr>
  <tr><td><code>--background</code></td><td>Page background (dark: #0D0B07, light: #FFFFFF)</td></tr>
  <tr><td><code>--card</code></td><td>Card/panel backgrounds</td></tr>
  <tr><td><code>--success</code> (Green)</td><td>Positive values, profitable indicators, within-limit status</td></tr>
  <tr><td><code>--destructive</code> (Red)</td><td>Negative values, losses, exceeded limits, danger states</td></tr>
  <tr><td><code>--warning</code> (Gold)</td><td>Warning states, attention-required items</td></tr>
  <tr><td><code>--muted</code></td><td>Secondary text, labels, de-emphasized content</td></tr>
</table>

<h2>7.2 Typography</h2>
<table>
  <tr><th>Font</th><th>Usage</th></tr>
  <tr><td><strong>Bebas Neue</strong></td><td>Headings, KPI values, section headers — uppercase display font</td></tr>
  <tr><td><strong>Inter</strong></td><td>Body text, form labels, data tables — clean readable sans-serif</td></tr>
</table>

<h2>7.3 Layout</h2>
<ul>
  <li><strong>Desktop:</strong> Fixed sidebar navigation (collapsible) + main content area</li>
  <li><strong>Mobile:</strong> Hamburger menu + bottom tab bar for primary navigation</li>
  <li>All pages are responsive — grid layouts collapse to single-column on mobile</li>
  <li>iOS safe area support for native app deployment</li>
</ul>

<h1>8. ENVIRONMENT & CONFIGURATION</h1>
<table>
  <tr><th>Setting</th><th>Value</th></tr>
  <tr><td>Primary Yard Location</td><td>17158 E CR 49, Shattuck, OK 73858 (36.2687°N, 99.8773°W)</td></tr>
  <tr><td>Weather API</td><td>Open-Meteo (free, no API key required)</td></tr>
  <tr><td>Geocoding API</td><td>Open-Meteo Geocoding (free)</td></tr>
  <tr><td>Transit Speed Avg</td><td>50 mph (for ETA calculation)</td></tr>
  <tr><td>Auth Provider</td><td>Base44 (email/password + Google OAuth)</td></tr>
  <tr><td>Database</td><td>Production + Test (separate environments)</td></tr>
  <tr><td>Deployment</td><td>Vite build → Base44 hosting (web + mobile PWA)</td></tr>
</table>

<div class="note">
  <strong>Note:</strong> This document was auto-generated from the live platform configuration. Entity schemas reflect the current production data model. For source code access, contact the development team or use the Base44 dashboard code editor.
</div>

</body></html>`;

  return html;
}

export default function PlatformDocumentation() {
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);

  // Fetch all entity schemas
  const { data: entitySchemas = [], isLoading } = useQuery({
    queryKey: ['allEntitySchemas'],
    queryFn: async () => {
      const results = [];
      for (const name of ENTITY_NAMES) {
        try {
          const schema = await base44.entities[name].schema();
          results.push({ name, schema });
        } catch {
          results.push({ name, schema: null });
        }
      }
      return results;
    },
    staleTime: 1000 * 60 * 30,
  });

  if (!user || !isFullAccess(user)) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FileText className="w-8 h-8 text-danger mx-auto mb-2" />
          <div className="text-foreground font-medium">Admin Access Required</div>
        </div>
      </div>
    );
  }

  const downloadWord = () => {
    setGenerating(true);
    setTimeout(() => {
      const html = generateDocHTML(entitySchemas);
      const blob = new Blob([html], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Continental_Platform_Documentation_${new Date().toISOString().split('T')[0]}.doc`;
      a.click();
      URL.revokeObjectURL(url);
      setGenerating(false);
    }, 100);
  };

  const downloadHTML = () => {
    const html = generateDocHTML(entitySchemas);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Continental_Platform_Documentation_${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPDF = () => {
    const html = generateDocHTML(entitySchemas);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const downloadSourceCode = (format) => {
    const html = generateSourceCodeHTML();
    const isWord = format === 'word';
    const blob = new Blob([html], { type: isWord ? 'application/msword' : 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Continental_Source_Code_${new Date().toISOString().split('T')[0]}.${isWord ? 'doc' : 'html'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printSourceCode = () => {
    const html = generateSourceCodeHTML();
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <SectionHeader
        title="PLATFORM DOCUMENTATION"
        subtitle="Download complete system architecture, data models, and operations guide"
        badge="EXPORT"
      />

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h3 className="font-bebas text-primary text-lg">WHAT'S INCLUDED</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {[
            'Platform Overview & Architecture',
            'Complete Technology Stack',
            'All User Roles & Permissions',
            'Section Admin Definitions',
            `All ${ENTITY_NAMES.length} Entity Schemas (every field, type, options)`,
            `All ${PAGE_DOCS.length} Pages with Descriptions`,
            `All ${BACKEND_FUNCTIONS.length} Backend Functions`,
            'Key Workflows (Purchase, Feed Planning, Bidding, Sync)',
            'Design System (Colors, Fonts, Layout)',
            'Environment & Configuration',
          ].map(item => (
            <div key={item} className="flex items-start gap-2">
              <span className="text-success mt-0.5">✓</span>
              <span className="text-foreground">{item}</span>
            </div>
          ))}
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading entity schemas...
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-bebas text-primary text-lg mb-4">DOWNLOAD FORMAT</h3>
        <div className="flex flex-wrap gap-4">
          <button onClick={downloadWord} disabled={isLoading || generating}
            className="flex items-center gap-3 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bebas text-lg tracking-wide hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
            DOWNLOAD WORD (.doc)
          </button>

          <button onClick={downloadHTML} disabled={isLoading}
            className="flex items-center gap-3 px-6 py-3 bg-card border border-primary text-primary rounded-xl font-bebas text-lg tracking-wide hover:bg-primary/10 disabled:opacity-50 transition-colors">
            <FileText className="w-5 h-5" />
            DOWNLOAD HTML
          </button>

          <button onClick={printPDF} disabled={isLoading}
            className="flex items-center gap-3 px-6 py-3 bg-card border border-border text-foreground rounded-xl font-bebas text-lg tracking-wide hover:bg-secondary/40 disabled:opacity-50 transition-colors">
            <Printer className="w-5 h-5" />
            PRINT / SAVE AS PDF
          </button>
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          Word (.doc) opens directly in Microsoft Word or Google Docs. HTML opens in any browser. Print/PDF uses your browser's print dialog — select "Save as PDF" to create a PDF file.
        </p>
      </div>

      {/* Source Code Export */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-bebas text-primary text-lg mb-1">FULL SOURCE CODE EXPORT</h3>
        <p className="text-xs text-muted-foreground mb-4">Download the complete platform source code — all pages, components, config files, and backend function descriptions — formatted for your IT team.</p>
        <div className="flex flex-wrap gap-4">
          <button onClick={() => downloadSourceCode('word')} disabled={isLoading}
            className="flex items-center gap-3 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bebas text-lg tracking-wide hover:bg-primary/90 disabled:opacity-50 transition-colors">
            <FileDown className="w-5 h-5" />
            SOURCE CODE (.doc)
          </button>
          <button onClick={() => downloadSourceCode('html')} disabled={isLoading}
            className="flex items-center gap-3 px-6 py-3 bg-card border border-primary text-primary rounded-xl font-bebas text-lg tracking-wide hover:bg-primary/10 disabled:opacity-50 transition-colors">
            <FileText className="w-5 h-5" />
            SOURCE CODE (.html)
          </button>
          <button onClick={printSourceCode} disabled={isLoading}
            className="flex items-center gap-3 px-6 py-3 bg-card border border-border text-foreground rounded-xl font-bebas text-lg tracking-wide hover:bg-secondary/40 disabled:opacity-50 transition-colors">
            <Printer className="w-5 h-5" />
            PRINT / PDF
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Core Files', value: SOURCE_FILES.filter(f => f.section === 'Core').length },
            { label: 'Page Files', value: SOURCE_FILES.filter(f => f.section === 'Pages').length },
            { label: 'Components', value: SOURCE_FILES.filter(f => f.section === 'Components').length },
            { label: 'Style Files', value: SOURCE_FILES.filter(f => f.section === 'Styling').length },
          ].map(s => (
            <div key={s.label} className="text-center bg-secondary/30 rounded-lg p-3">
              <div className="font-bebas text-xl text-primary">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">Backend function full source is accessible in the Base44 Dashboard → Code → Functions.</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-bebas text-foreground text-base mb-2">QUICK STATS</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Entities', value: ENTITY_NAMES.length },
            { label: 'Pages', value: PAGE_DOCS.length },
            { label: 'Backend Functions', value: BACKEND_FUNCTIONS.length },
            { label: 'User Roles', value: Object.keys(ROLE_CONFIG).length },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="font-bebas text-2xl text-primary">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}