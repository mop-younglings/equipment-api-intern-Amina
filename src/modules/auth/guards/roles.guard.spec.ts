import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { EmployeeRole } from '../../employee/enums/employee-role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  const createContext = (user: AuthenticatedUser): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new RolesGuard(reflector);
  });

  it('allows access when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const result = guard.canActivate(
      createContext({
        id: '1',
        email: 'user@example.com',
        role: EmployeeRole.USER,
      }),
    );

    expect(result).toBe(true);
  });

  it('allows access when user has required role', () => {
    reflector.getAllAndOverride.mockReturnValue([EmployeeRole.ADMIN]);

    const result = guard.canActivate(
      createContext({
        id: '1',
        email: 'admin@example.com',
        role: EmployeeRole.ADMIN,
      }),
    );

    expect(result).toBe(true);
  });

  it('throws ForbiddenException when user lacks required role', () => {
    reflector.getAllAndOverride.mockReturnValue([EmployeeRole.ADMIN]);

    expect(() =>
      guard.canActivate(
        createContext({
          id: '1',
          email: 'user@example.com',
          role: EmployeeRole.USER,
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('reads roles from reflector metadata key', () => {
    const handler = jest.fn();
    const classRef = jest.fn();
    reflector.getAllAndOverride.mockReturnValue([]);

    guard.canActivate({
      getHandler: () => handler,
      getClass: () => classRef,
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            id: '1',
            email: 'user@example.com',
            role: EmployeeRole.USER,
          },
        }),
      }),
    } as unknown as ExecutionContext);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
      handler,
      classRef,
    ]);
  });
});
