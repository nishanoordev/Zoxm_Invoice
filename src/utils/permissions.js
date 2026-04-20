/**
 * permissions.js — Role-Based Access Control (RBAC) Logic
 * 
 * Roles:
 *  - 'admin' (Owner): Full access to everything.
 *  - 'manager': Access to reports, customers, items, invoices. No system settings/delete.
 *  - 'staff': Access to creating and viewing invoices/items/customers. No reports/settings/delete.
 */

const ROLE_PERMISSIONS = {
  admin: {
    canViewSettings: true,
    canEditBusinessDetails: true, // GST, Bank
    canManageTeam: true,
    canDeleteRecords: true,
    canViewReports: true,
    canSyncToCloud: true,
  },
  manager: {
    canViewSettings: true,
    canEditBusinessDetails: false,
    canManageTeam: false,
    canDeleteRecords: false,
    canViewReports: true,
    canSyncToCloud: true,
  },
  staff: {
    canViewSettings: false,
    canEditBusinessDetails: false,
    canManageTeam: false,
    canDeleteRecords: false,
    canViewReports: false,
    canSyncToCloud: true,
  }
};

/**
 * Checks if a role has permission for a specific feature.
 * @param {string} role - 'admin' | 'manager' | 'staff'
 * @param {string} permission - Key from ROLE_PERMISSIONS
 * @returns {boolean}
 */
export const checkPermission = (role, permission) => {
  if (!role) return false;
  const lowerRole = role.toLowerCase();
  if (!ROLE_PERMISSIONS[lowerRole]) return false;
  return ROLE_PERMISSIONS[lowerRole][permission] || false;
};

/**
 * Higher-order helper for UI guarding.
 * Returns the value if permitted, otherwise returns null or a fallback.
 */
export const guard = (role, permission, ifTrue, ifFalse = null) => {
  return checkPermission(role, permission) ? ifTrue : ifFalse;
};
