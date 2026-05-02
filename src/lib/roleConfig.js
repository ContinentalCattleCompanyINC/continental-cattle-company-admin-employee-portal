// Role-based access control configuration
export const ROLE_CONFIG = {
  super_admin: {
    label: 'Super Administrator',
    description: 'Unlimited access to all platform features and data',
    permissions: [
      'view_dashboard',
      'view_market',
      'view_roi',
      'view_lots',
      'view_playbook',
      'view_programs',
      'view_financials',
      'view_carcass_quality',
      'view_approvals',
      'view_settings',
      'view_master_document',
      'manage_users',
      'approve_orders',
      'edit_settings',
      'manage_all_entities',
    ],
  },
  admin: {
    label: 'Administrator',
    description: 'Full access to all platform features and data',
    permissions: [
      'view_dashboard',
      'view_market',
      'view_roi',
      'view_lots',
      'view_playbook',
      'view_programs',
      'view_financials',
      'view_carcass_quality',
      'view_approvals',
      'view_settings',
      'view_master_document',
      'manage_users',
      'approve_orders',
      'edit_settings',
    ],
  },
  office_manager: {
    label: 'Office Manager',
    description: 'Manage documents, users, and office operations',
    permissions: [
      'view_dashboard',
      'view_market',
      'view_lots',
      'view_master_document',
      'manage_users',
      'manage_documents',
      'edit_office_info',
    ],
  },
  attorney_cpa: {
    label: 'Attorney / CPA',
    description: 'Access to legal, tax, and financial documents',
    permissions: [
      'view_master_document',
      'view_financials',
      'view_contracts',
      'view_bank_statements',
    ],
  },
  manager: {
    label: 'Manager',
    description: 'Access to operational and planning tools',
    permissions: [
      'view_dashboard',
      'view_market',
      'view_roi',
      'view_lots',
      'view_playbook',
      'view_programs',
      'view_carcass_quality',
      'view_feed_health',
      'view_sensitivity',
      'view_trucking',
    ],
  },
  user: {
    label: 'User',
    description: 'Access to market data and basic tools',
    permissions: [
      'view_dashboard',
      'view_market',
      'view_roi',
      'view_lots',
      'view_cutout',
      'view_enterprise',
      'view_global_intel',
      'view_trade_analytics',
    ],
  },
};

// Check if user has a specific permission
export function hasPermission(userRole, permission) {
  const role = ROLE_CONFIG[userRole];
  return role ? role.permissions.includes(permission) : false;
}

// Get allowed pages for a role
export function getAllowedPages(userRole) {
  const role = ROLE_CONFIG[userRole];
  if (!role) return [];
  
  const pageMap = {
    view_dashboard: '/',
    view_market: '/market',
    view_roi: '/roi-ladder',
    view_lots: '/lots',
    view_playbook: '/playbook',
    view_programs: '/programs',
    view_financials: '/entity-financials',
    view_carcass_quality: '/carcass-quality',
    view_approvals: '/approvals',
    view_settings: '/settings',
    view_master_document: '/document',
    view_feed_health: '/feed-health',
    view_sensitivity: '/sensitivity',
    view_trucking: '/trucking',
    view_cutout: '/cutout',
    view_enterprise: '/enterprise',
    view_global_intel: '/global',
    view_trade_analytics: '/trade-analytics',
  };

  return role.permissions
    .filter(p => pageMap[p])
    .map(p => pageMap[p]);
}