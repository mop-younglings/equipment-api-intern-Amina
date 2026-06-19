import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Department } from '../../department/entities/department.entity';
import { Employee } from '../../employee/entities/employee.entity';
import { AccountStatus } from '../../employee/enums/account-status.enum';
import { EmployeeRole } from '../../employee/enums/employee-role.enum';
import { UpdateUserRoleDto, UpdateUserStatusDto } from '../dto/admin.dto';
import { AuthService } from '../../auth/services/auth.service';
import { AdminService } from './admin.service';

jest.mock('bcrypt');

describe('AdminService', () => {
  let service: AdminService;
  let employeeRepository: jest.Mocked<Repository<Employee>>;
  let departmentRepository: jest.Mocked<Repository<Department>>;
  let authService: jest.Mocked<Pick<AuthService, 'revokeAllSessions'>>;

  const userId = 'user-1';

  const mockEmployee: Employee = {
    id: userId,
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    password: 'hash',
    role: EmployeeRole.EMPLOYEE,
    accountStatus: AccountStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: getRepositoryToken(Employee),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Department),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: AuthService,
          useValue: { revokeAllSessions: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(AdminService);
    employeeRepository = module.get(getRepositoryToken(Employee));
    departmentRepository = module.get(getRepositoryToken(Department));
    authService = module.get(AuthService);
    jest.clearAllMocks();
  });

  describe('findUser', () => {
    it('throws NotFoundException when user missing', async () => {
      employeeRepository.findOne.mockResolvedValue(null);

      await expect(service.findUser(userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateRole', () => {
    it('updates user role', async () => {
      const dto: UpdateUserRoleDto = { role: EmployeeRole.DIRECT_MANAGER };
      employeeRepository.findOne.mockResolvedValue({ ...mockEmployee });
      employeeRepository.save.mockImplementation(async (user) => user);

      const result = await service.updateRole(userId, dto);

      expect(result.role).toBe(EmployeeRole.DIRECT_MANAGER);
      expect(employeeRepository.save).toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('deactivates user account', async () => {
      const dto: UpdateUserStatusDto = {
        accountStatus: AccountStatus.INACTIVE,
      };
      employeeRepository.findOne.mockResolvedValue({ ...mockEmployee });
      employeeRepository.save.mockImplementation(async (user) => user);

      const result = await service.updateStatus(userId, dto);

      expect(result.accountStatus).toBe(AccountStatus.INACTIVE);
      expect(authService.revokeAllSessions).toHaveBeenCalledWith(userId);
    });
  });

  describe('createUser', () => {
    it('throws ConflictException when email exists', async () => {
      employeeRepository.findOne.mockResolvedValue(mockEmployee);

      await expect(
        service.createUser({
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates user with hashed password', async () => {
      employeeRepository.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      employeeRepository.create.mockReturnValue(mockEmployee);
      employeeRepository.save.mockResolvedValue(mockEmployee);

      const result = await service.createUser({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'new@example.com',
        password: 'password123',
        role: EmployeeRole.EMPLOYEE,
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(result).toEqual(mockEmployee);
      expect(departmentRepository.findOne).not.toHaveBeenCalled();
    });

    it('creates user with department', async () => {
      employeeRepository.findOne.mockResolvedValue(null);
      departmentRepository.findOne.mockResolvedValue({
        id: 'd1',
      } as Department);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      employeeRepository.create.mockReturnValue(mockEmployee);
      employeeRepository.save.mockResolvedValue(mockEmployee);

      await service.createUser({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'new@example.com',
        password: 'password123',
        departmentId: 'd1',
      });

      expect(departmentRepository.findOne).toHaveBeenCalled();
    });
  });

  describe('updateUser and resetPassword', () => {
    it('updates user department to null', async () => {
      employeeRepository.findOne.mockResolvedValue({
        ...mockEmployee,
        department: { id: 'd1' } as Department,
      });
      employeeRepository.save.mockImplementation(async (user) => user);

      const result = await service.updateUser(userId, { departmentId: null });
      expect(result.department).toBeUndefined();
    });

    it('resets password', async () => {
      employeeRepository.findOne.mockResolvedValue({ ...mockEmployee });
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
      employeeRepository.save.mockResolvedValue(mockEmployee);

      await service.resetPassword(userId, { password: 'newpassword' });
      expect(bcrypt.hash).toHaveBeenCalled();
      expect(authService.revokeAllSessions).toHaveBeenCalledWith(userId);
    });

    it('removes user', async () => {
      employeeRepository.findOne.mockResolvedValue(mockEmployee);
      await service.removeUser(userId);
      expect(employeeRepository.remove).toHaveBeenCalledWith(mockEmployee);
    });
  });
});
