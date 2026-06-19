import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeRole } from '../../employee/enums/employee-role.enum';
import { AuthController } from './auth.controller';
import { AuthService } from '../services/auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  const authService = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    getProfile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();
    controller = module.get(AuthController);
    jest.clearAllMocks();
  });

  it('registers user', async () => {
    authService.register.mockResolvedValue({ id: 'u1' });
    await controller.register({} as never);
    expect(authService.register).toHaveBeenCalled();
  });

  it('returns profile', async () => {
    authService.getProfile.mockResolvedValue({ id: 'u1' });
    const result = await controller.me({
      id: 'u1',
      email: 'a@b.com',
      role: EmployeeRole.EMPLOYEE,
    });
    expect(result.id).toBe('u1');
  });
});
