// Role-based access control configuration
// INTERNAL roles: super_admin, admin, manager, office_manager, accountant
// OPERATIONS roles: field_rep, sales_rep, cowboy, feed_mill, feed_truck, dispatch, truck_driver, truck_owner, welder, maintenance, investor, banker
// EXTERNAL roles (require approval): buyer, seller, hauler, attorney_cpa

export const ROLE_CONFIG = {
  // ─── EXECUTIVE / ADMIN ──────────────────────────────────────────────────────
  super_admin: {
    label: 'Super Administrator',
    category: 'Executive',
    description: 'Unlimited access to all platform features and data',
    isExternal: false,
    color: 'text-primary',
    permissions: ['*'],
  },
  admin: {
    label: 'Administrator',
    category: 'Executive',
    description: 'Full access to all platform features',
    isExternal: false,
    color: 'text-primary',
    permissions: [
      'view_dashboard', 'view_market', 'view_roi', 'view_lots', 'view_playbook',
      'view_programs', 'view_financials', 'view_carcass_quality', 'view_approvals',
      'view_settings', 'view_master_document', 'manage_users', 'approve_orders',
      'edit_settings', 'view_marketplace', 'view_load_board', 'view_bids_admin',
      'view_system_health', 'view_ai_management', 'view_corporate_structure',
      'view_staff_portal', 'view_ai_ops_advisor', 'view_financial_intelligence',
    ],
  },

  // ─── FINANCIAL / LEGAL ──────────────────────────────────────────────────────
  accountant: {
    label: 'Accountant / CPA',
    category: 'Financial',
    description: 'Full financial, legal and accounting access',
    isExternal: false,
    color: 'text-blue-400',
    permissions: [
      'view_dashboard', 'view_financials', 'view_master_document',
      'view_entity_financials', 'view_settlements', 'view_transactions',
      'view_corporate_structure', 'view_financial_intelligence',
    ],
  },
  attorney_cpa: {
    label: 'Attorney / CPA (External)',
    category: 'Financial',
    description: 'Financial documents, contracts and legal review',
    isExternal: true,
    color: 'text-blue-300',
    permissions: [
      'view_financials', 'view_master_document', 'view_entity_financials',
      'view_settlements', 'view_transactions', 'view_corporate_structure',
    ],
  },
  investor: {
    label: 'Investor',
    category: 'Financial',
    description: 'Investment performance, ROI, and entity financials',
    isExternal: true,
    color: 'text-purple-400',
    permissions: [
      'view_dashboard', 'view_roi', 'view_financials', 'view_entity_financials',
      'view_financial_intelligence', 'view_lots', 'view_programs',
    ],
  },
  banker: {
    label: 'Banker / Lender',
    category: 'Financial',
    description: 'Financial statements, cattle inventory, loan collateral review',
    isExternal: true,
    color: 'text-indigo-400',
    permissions: [
      'view_dashboard', 'view_lots', 'view_financials', 'view_entity_financials',
    ],
  },

  // ─── MANAGEMENT / OPERATIONS ────────────────────────────────────────────────
  manager: {
    label: 'Manager',
    category: 'Management',
    description: 'Operational tools and planning across all entities',
    isExternal: false,
    color: 'text-amber-400',
    permissions: [
      'view_dashboard', 'view_market', 'view_roi', 'view_lots', 'view_playbook',
      'view_programs', 'view_carcass_quality', 'view_feed_health', 'view_feedlot_ops',
      'view_lot_performance', 'view_sensitivity', 'view_trucking', 'view_marketplace',
      'view_bids_admin', 'view_corporate_structure', 'view_staff_portal',
      'view_field_rep', 'view_ai_feed_planner', 'view_ai_ops_advisor',
      'view_financial_intelligence',
    ],
  },
  office_manager: {
    label: 'Office Manager',
    category: 'Management',
    description: 'Office operations, documents, staff management',
    isExternal: false,
    color: 'text-amber-300',
    permissions: [
      'view_dashboard', 'view_market', 'view_lots', 'view_master_document',
      'manage_documents', 'manage_users', 'view_staff_portal', 'view_trucking',
    ],
  },
  dispatch: {
    label: 'Dispatch',
    category: 'Trucking',
    description: 'Trucking dispatch, load board, and driver coordination',
    isExternal: false,
    color: 'text-orange-400',
    permissions: [
      'view_dashboard', 'view_load_board', 'view_trucking', 'view_lots',
      'view_staff_portal',
    ],
  },

  // ─── TRUCKING / TRANSPORT ───────────────────────────────────────────────────
  truck_owner: {
    label: 'Truck Owner',
    category: 'Trucking',
    description: 'Fleet management, load board, BOLs, driver assignments',
    isExternal: false,
    color: 'text-orange-400',
    permissions: [
      'view_dashboard', 'view_load_board', 'view_trucking', 'view_staff_portal',
    ],
  },
  truck_driver: {
    label: 'Truck Driver',
    category: 'Trucking',
    description: 'Assigned loads, BOLs, and delivery confirmations',
    isExternal: false,
    color: 'text-orange-300',
    permissions: [
      'view_load_board', 'view_staff_portal',
    ],
  },
  hauler: {
    label: 'Hauler (External)',
    category: 'Trucking',
    description: 'External load board and BOL management',
    isExternal: true,
    color: 'text-orange-300',
    permissions: ['view_load_board'],
  },

  // ─── CATTLE OPERATIONS ──────────────────────────────────────────────────────
  cowboy: {
    label: 'Cowboy / Ranch Hand',
    category: 'Ranch Ops',
    description: 'Health events, lot checks, pen observations',
    isExternal: false,
    color: 'text-green-400',
    permissions: [
      'view_lot_performance', 'view_lots', 'view_feedlot_ops', 'view_staff_portal',
    ],
  },
  field_rep: {
    label: 'Field Representative',
    category: 'Ranch Ops',
    description: 'Field submissions, lot listings, on-the-ground updates',
    isExternal: false,
    color: 'text-green-400',
    permissions: [
      'view_field_rep', 'view_lots', 'view_lot_performance', 'view_staff_portal',
    ],
  },
  sales_rep: {
    label: 'Sales Representative',
    category: 'Ranch Ops',
    description: 'Marketplace, submissions, buyer/seller relations',
    isExternal: false,
    color: 'text-green-300',
    permissions: [
      'view_marketplace', 'view_field_rep', 'view_lots', 'view_playbook',
      'view_staff_portal',
    ],
  },

  // ─── FEEDLOT OPERATIONS ─────────────────────────────────────────────────────
  feed_mill: {
    label: 'Feed Mill Operator',
    category: 'Feedlot',
    description: 'Ration mixing, feed orders, commodity inventory',
    isExternal: false,
    color: 'text-yellow-400',
    permissions: [
      'view_feedlot_ops', 'view_feed_health', 'view_staff_portal',
    ],
  },
  feed_truck: {
    label: 'Feed Truck Driver',
    category: 'Feedlot',
    description: 'Feed delivery, pen-by-pen order completion',
    isExternal: false,
    color: 'text-yellow-300',
    permissions: [
      'view_feedlot_ops', 'view_staff_portal',
    ],
  },

  // ─── MAINTENANCE / FACILITIES ───────────────────────────────────────────────
  welder: {
    label: 'Welder',
    category: 'Maintenance',
    description: 'Equipment repair tickets, work orders, pen maintenance',
    isExternal: false,
    color: 'text-red-400',
    permissions: [
      'view_maintenance', 'view_staff_portal',
    ],
  },
  maintenance: {
    label: 'Maintenance Tech',
    category: 'Maintenance',
    description: 'Facility maintenance, equipment work orders',
    isExternal: false,
    color: 'text-red-400',
    permissions: [
      'view_maintenance', 'view_staff_portal',
    ],
  },

  // ─── MARKETPLACE EXTERNAL ───────────────────────────────────────────────────
  buyer: {
    label: 'Buyer',
    category: 'External',
    description: 'Live marketplace access to bid on cattle lots',
    isExternal: true,
    color: 'text-cyan-400',
    permissions: ['view_marketplace', 'view_my_bids', 'view_my_settlements'],
  },
  seller: {
    label: 'Seller',
    category: 'External',
    description: 'View and manage your listings and sale updates',
    isExternal: true,
    color: 'text-cyan-300',
    permissions: ['view_my_listings', 'view_my_settlements'],
  },

  pending: {
    label: 'Pending Approval',
    category: 'System',
    description: 'Account awaiting admin approval',
    isExternal: true,
    color: 'text-muted-foreground',
    permissions: [],
  },
  user: {
    label: 'General User',
    category: 'System',
    description: 'Basic platform access',
    isExternal: false,
    color: 'text-muted-foreground',
    permissions: ['view_dashboard', 'view_market', 'view_lots'],
  },
};

export const ROLE_CATEGORIES = {
  Executive:    ['super_admin', 'admin'],
  Financial:    ['accountant', 'attorney_cpa', 'investor', 'banker'],
  Management:   ['manager', 'office_manager', 'dispatch'],
  Trucking:     ['truck_owner', 'truck_driver', 'hauler'],
  'Ranch Ops':  ['cowboy', 'field_rep', 'sales_rep'],
  Feedlot:      ['feed_mill', 'feed_truck'],
  Maintenance:  ['welder', 'maintenance'],
  External:     ['buyer', 'seller'],
};

export const EXTERNAL_ROLES = ['buyer', 'seller', 'hauler', 'attorney_cpa', 'investor', 'banker', 'pending'];
export const INTERNAL_ROLES = ['super_admin', 'admin', 'accountant', 'manager', 'office_manager', 'dispatch',
  'truck_owner', 'truck_driver', 'cowboy', 'field_rep', 'sales_rep', 'feed_mill', 'feed_truck', 'welder', 'maintenance'];

export function isExternalRole(role) {
  return EXTERNAL_ROLES.includes(role);
}

export function hasPermission(userRole, permission) {
  const role = ROLE_CONFIG[userRole];
  if (!role) return false;
  if (role.permissions.includes('*')) return true;
  return role.permissions.includes(permission);
}

export function getAllowedPages(userRole) {
  const role = ROLE_CONFIG[userRole];
  if (!role) return [];
  if (role.permissions.includes('*')) return 'all';

  const pageMap = {
    view_dashboard: '/',
    view_market: '/market',
    view_roi: '/roi-ladder',
    view_lots: '/lots',
    view_playbook: '/playbook',
    view_programs: '/programs',
    view_financials: '/entity-financials',
    view_entity_financials: '/entity-financials',
    view_carcass_quality: '/carcass-quality',
    view_approvals: '/approvals',
    view_settings: '/settings',
    view_master_document: '/document',
    view_feed_health: '/feed-health',
    view_feedlot_ops: '/feedlot-ops',
    view_lot_performance: '/lot-performance',
    view_sensitivity: '/sensitivity',
    view_trucking: '/trucking',
    view_marketplace: '/marketplace',
    view_load_board: '/load-board',
    view_my_listings: '/my-listings',
    view_settlements: '/marketplace',
    view_my_bids: '/marketplace',
    view_my_settlements: '/marketplace',
    view_system_health: '/system-health',
    view_ai_management: '/ai-management',
    view_corporate_structure: '/corporate-structure',
    view_staff_portal: '/staff-portal',
    view_field_rep: '/field-rep',
    view_ai_feed_planner: '/ai-feed-planner',
    view_ai_ops_advisor: '/ai-ops-advisor',
    view_financial_intelligence: '/financial-intelligence',
    view_maintenance: '/maintenance',
  };

  return role.permissions.filter(p => pageMap[p]).map(p => pageMap[p]);
}