import { SetMetadata } from '@nestjs/common';
import { EmployeeRole } from '../../employee/enums/employee-role.enum';

export const MIN_ROLE_KEY = 'minRole';

export const MinRole = (role: EmployeeRole) => SetMetadata(MIN_ROLE_KEY, role);
