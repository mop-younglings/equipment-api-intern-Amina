export enum EmployeeRole {
  EMPLOYEE = 'employee',
  DIRECT_MANAGER = 'direct_manager',
  PROCUREMENT_MANAGER = 'procurement_manager',
  ADMIN = 'admin',
}

export const ROLE_HIERARCHY: Record<EmployeeRole, number> = {
  [EmployeeRole.EMPLOYEE]: 1,
  [EmployeeRole.DIRECT_MANAGER]: 2,
  [EmployeeRole.PROCUREMENT_MANAGER]: 3,
  [EmployeeRole.ADMIN]: 4,
};

export function hasMinimumRole(
  userRole: EmployeeRole,
  requiredRole: EmployeeRole,
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
