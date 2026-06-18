import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from '../types/authenticated-user.type';
import { Department } from '../../modules/department/entities/department.entity';
import { Employee } from '../../modules/employee/entities/employee.entity';
import { EmployeeRole } from '../../modules/employee/enums/employee-role.enum';
import { AccessControlService } from './access-control.service';

describe('AccessControlService', () => {
  let service: AccessControlService;
  let departmentRepository: jest.Mocked<Repository<Department>>;
  let employeeRepository: jest.Mocked<Repository<Employee>>;

  const managerId = 'manager-1';
  const employeeId = 'employee-1';
  const deptId = 'dept-1';

  const managerUser: AuthenticatedUser = {
    id: managerId,
    email: 'manager@example.com',
    role: EmployeeRole.DIRECT_MANAGER,
  };

  const employeeUser: AuthenticatedUser = {
    id: employeeId,
    email: 'employee@example.com',
    role: EmployeeRole.EMPLOYEE,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessControlService,
        {
          provide: getRepositoryToken(Department),
          useValue: { find: jest.fn() },
        },
        {
          provide: getRepositoryToken(Employee),
          useValue: { findOne: jest.fn(), find: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(AccessControlService);
    departmentRepository = module.get(getRepositoryToken(Department));
    employeeRepository = module.get(getRepositoryToken(Employee));
  });

  describe('role checks', () => {
    it('identifies admin users', () => {
      expect(
        service.isAdmin({
          id: '1',
          email: 'a@example.com',
          role: EmployeeRole.ADMIN,
        }),
      ).toBe(true);
      expect(service.isAdmin(employeeUser)).toBe(false);
    });

    it('checks procurement manager or above', () => {
      expect(
        service.isProcurementManagerOrAbove({
          id: '1',
          email: 'p@example.com',
          role: EmployeeRole.PROCUREMENT_MANAGER,
        }),
      ).toBe(true);
      expect(
        service.isProcurementManagerOrAbove({
          id: '1',
          email: 'a@example.com',
          role: EmployeeRole.ADMIN,
        }),
      ).toBe(true);
      expect(service.isProcurementManagerOrAbove(managerUser)).toBe(false);
    });

    it('checks direct manager or above', () => {
      expect(service.isDirectManagerOrAbove(managerUser)).toBe(true);
      expect(service.isDirectManagerOrAbove(employeeUser)).toBe(false);
    });
  });

  describe('getManagedDepartmentIds', () => {
    it('returns department ids managed by user', async () => {
      departmentRepository.find.mockResolvedValue([
        { id: deptId } as Department,
      ]);

      const result = await service.getManagedDepartmentIds(managerId);

      expect(result).toEqual([deptId]);
      expect(departmentRepository.find).toHaveBeenCalledWith({
        where: { directManager: { id: managerId } },
        select: { id: true },
      });
    });
  });

  describe('isEmployeeInManagedDepartments', () => {
    it('returns true when employee is in a managed department', async () => {
      departmentRepository.find.mockResolvedValue([
        { id: deptId } as Department,
      ]);
      employeeRepository.findOne.mockResolvedValue({
        id: employeeId,
        department: { id: deptId },
      } as Employee);

      const result = await service.isEmployeeInManagedDepartments(
        managerId,
        employeeId,
      );

      expect(result).toBe(true);
    });

    it('returns false when manager has no departments', async () => {
      departmentRepository.find.mockResolvedValue([]);

      const result = await service.isEmployeeInManagedDepartments(
        managerId,
        employeeId,
      );

      expect(result).toBe(false);
    });
  });

  describe('getDepartmentEmployeeIds', () => {
    it('returns employee ids for departments', async () => {
      employeeRepository.find.mockResolvedValue([
        { id: employeeId } as Employee,
      ]);

      const result = await service.getDepartmentEmployeeIds([deptId]);

      expect(result).toEqual([employeeId]);
    });

    it('returns empty array for no departments', async () => {
      const result = await service.getDepartmentEmployeeIds([]);

      expect(result).toEqual([]);
      expect(employeeRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('findProcurementManager', () => {
    it('returns first procurement manager', async () => {
      const procurementManager = {
        id: 'proc-1',
        role: EmployeeRole.PROCUREMENT_MANAGER,
      } as Employee;
      employeeRepository.findOne.mockResolvedValue(procurementManager);

      const result = await service.findProcurementManager();

      expect(result).toEqual(procurementManager);
      expect(employeeRepository.findOne).toHaveBeenCalledWith({
        where: { role: EmployeeRole.PROCUREMENT_MANAGER },
        order: { createdAt: 'ASC' },
      });
    });
  });
});
