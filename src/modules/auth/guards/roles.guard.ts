import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import {
  EmployeeRole,
  hasMinimumRole,
} from '../../employee/enums/employee-role.enum';
import { MIN_ROLE_KEY } from '../decorators/min-role.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<EmployeeRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const minRole = this.reflector.getAllAndOverride<EmployeeRole>(
      MIN_ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length && !minRole) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user: AuthenticatedUser }>();
    const user = request.user;

    if (minRole && hasMinimumRole(user.role, minRole)) {
      return true;
    }

    if (requiredRoles?.length && requiredRoles.includes(user.role)) {
      return true;
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}
