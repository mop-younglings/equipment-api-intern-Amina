import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../../department/entities/department.entity';
import { Employee } from '../entities/employee.entity';
import { AccountStatus } from '../enums/account-status.enum';
import { EmployeeRole } from '../enums/employee-role.enum';
import { EmployeeService } from './employee.service';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let repository: jest.Mocked<Repository<Employee>>;

  const employeeId = '550e8400-e29b-41d4-a716-446655440000';

  const mockEmployee: Employee = {
    id: employeeId,
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@example.com',
    password: 'hash',
    role: EmployeeRole.EMPLOYEE,
    accountStatus: AccountStatus.ACTIVE,
    department: { id: 'dept-1', name: 'Engineering' } as Department,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeService,
        {
          provide: getRepositoryToken(Employee),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(EmployeeService);
    repository = module.get(getRepositoryToken(Employee));
  });

  describe('findAll', () => {
    it('returns employees with department and assets', async () => {
      repository.find.mockResolvedValue([mockEmployee]);

      const result = await service.findAll();

      expect(result).toEqual([mockEmployee]);
      expect(repository.find).toHaveBeenCalledWith({
        relations: { department: true, assignedAssets: true },
        order: { lastName: 'ASC', firstName: 'ASC' },
      });
    });
  });

  describe('findOne', () => {
    it('returns employee when found', async () => {
      repository.findOne.mockResolvedValue(mockEmployee);

      const result = await service.findOne(employeeId);

      expect(result).toEqual(mockEmployee);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: employeeId },
        relations: {
          department: true,
          assignedAssets: { equipmentModel: true },
        },
      });
    });

    it('throws NotFoundException when employee does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(employeeId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
