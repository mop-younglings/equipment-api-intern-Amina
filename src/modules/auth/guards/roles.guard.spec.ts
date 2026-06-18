import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { EmployeeRole } from '../../employee/enums/employee-role.enum';
import { MIN_ROLE_KEY } from '../decorators/min-role.decorator';
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
        role: EmployeeRole.EMPLOYEE,
      }),
    );

    expect(result).toBe(true);
  });

  it('allows access when user has required role', () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === ROLES_KEY) return [EmployeeRole.ADMIN];
      return undefined;
    });

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
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === ROLES_KEY) return [EmployeeRole.ADMIN];
      return undefined;
    });

    expect(() =>
      guard.canActivate(
        createContext({
          id: '1',
          email: 'user@example.com',
          role: EmployeeRole.EMPLOYEE,
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('allows access when user meets minimum role', () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === MIN_ROLE_KEY) return EmployeeRole.DIRECT_MANAGER;
      return undefined;
    });

    const result = guard.canActivate(
      createContext({
        id: '1',
        email: 'manager@example.com',
        role: EmployeeRole.PROCUREMENT_MANAGER,
      }),
    );

    expect(result).toBe(true);
  });

  it('reads roles from reflector metadata key', () => {
    const handler = jest.fn();
    const classRef = jest.fn();
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === ROLES_KEY) return [];
      return undefined;
    });

    const result = guard.canActivate({
      getHandler: () => handler,
      getClass: () => classRef,
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            id: '1',
            email: 'user@example.com',
            role: EmployeeRole.EMPLOYEE,
          },
        }),
      }),
    } as unknown as ExecutionContext);

    expect(result).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
      handler,
      classRef,
    ]);
  });
});
