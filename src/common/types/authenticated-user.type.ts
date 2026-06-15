import { EmployeeRole } from '../../modules/employee/enums/employee-role.enum';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: EmployeeRole;
}
