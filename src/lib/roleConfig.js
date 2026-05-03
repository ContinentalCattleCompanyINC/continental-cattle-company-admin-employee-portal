// Role-based access control configuration
// INTERNAL roles: super_admin, admin, manager, office_manager, accountant
// EXTERNAL roles (require approval): buyer, seller, hauler, attorney_cpa

export const ROLE_CONFIG = {
  super_admin: {
    label: 'Super Administrator',
    description: 'Unlimited access to all platform features and data',
    isExternal: false,
    permissions: ['*'], // All permissions
  },
  admin: {
    label: 'Administrator',
    description: 'Full access to all platform features',
    isExternal: false,
    permissions: [
      'view_dashboard', 'view_market', 'view_roi', 'view_lots', 'view_playbook',
      'view_programs', 'view_financials', 'view_carcass_quality', 'view_approvals',
      'view_settings', 'view_master_document', 'manage_users', 'approve_orders',
      'edit_settings', 'view_marketplace', 'view_load_board', 'view_bids_admin',
      'view_system_health', 'view_ai_management',
    ],
  },
  accountant: {
    label: 'Accountant / CPA',
    description: 'Full financial, legal and accounting access',
    isExternal: false,
    permissions: [
      'view_dashboard', 'view_financials', 'view_master_document',
      'view_entity_financials', 'view_settlements', 'view_transactions',
    ],
  },
  manager: {
    label: 'Manager',
    description: 'Operational tools and planning',
    isExternal: false,
    permissions: [
      'view_dashboard', 'view_market', 'view_roi', 'view_lots', 'view_playbook',
      'view_programs', 'view_carcass_quality', 'view_feed_health',
      'view_sensitivity', 'view_trucking', 'view_marketplace', 'view_bids_admin',
    ],
  },
  office_manager: {
    label: 'Office Manager',
    description: 'Office operations and document management',
    isExternal: false,
    permissions: [
      'view_dashboard', 'view_market', 'view_lots', 'view_master_document',
      'manage_documents',
    ],
  },
  // ---- EXTERNAL ROLES (require admin approval) ----
  buyer: {
    label: 'Buyer',
    description: 'Live marketplace access to bid on cattle lots',
    isExternal: true,
    permissions: ['view_marketplace', 'view_my_bids', 'view_my_settlements'],
  },
  seller: {
    label: 'Seller',
    description: 'View and manage your listings and sale updates',
    isExternal: true,
    permissions: ['view_my_listings', 'view_my_settlements'],
  },
  hauler: {
    label: 'Hauler / Trucking',
    description: 'Load board and BOL management',
    isExternal: true,
    permissions: ['view_load_board', 'view_my_bols'],
  },
  attorney_cpa: {
    label: 'Attorney / CPA',
    description: 'Financial documents, contracts and legal review',
    isExternal: true,
    permissions: [
      'view_financials', 'view_master_document', 'view_entity_financials',
      'view_settlements', 'view_transactions',
    ],
  },
  pending: {
    label: 'Pending Approval',
    description: 'Account awaiting admin approval',
    isExternal: true,
    permissions: [],
  },
};

export const EXTERNAL_ROLES = ['buyer', 'seller', 'hauler', 'attorney_cpa', 'pending'];
export const INTERNAL_ROLES = ['super_admin', 'admin', 'accountant', 'manager', 'office_manager'];

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
    view_sensitivity: '/sensitivity',
    view_trucking: '/trucking',
    view_marketplace: '/marketplace',
    view_load_board: '/load-board',
    view_my_listings: '/my-listings',
    view_settlements: '/settlements',
    view_my_bids: '/marketplace',
    view_my_settlements: '/marketplace',
    view_system_health: '/system-health',
    view_ai_management: '/ai-management',
  };

  return role.permissions.filter(p => pageMap[p]).map(p => pageMap[p]);
}