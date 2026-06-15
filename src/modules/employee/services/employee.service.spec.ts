import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { Employee } from '../entities/employee.entity';
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
    department: 'Engineering',
    password: 'hash',
    role: EmployeeRole.USER,
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
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(EmployeeService);
    repository = module.get(getRepositoryToken(Employee));
  });

  describe('findAll', () => {
    it('returns employees ordered by name', async () => {
      repository.find.mockResolvedValue([mockEmployee]);

      const result = await service.findAll();

      expect(result).toEqual([mockEmployee]);
      expect(repository.find).toHaveBeenCalledWith({
        relations: { assignedEquipment: true },
        order: { lastName: 'ASC', firstName: 'ASC' },
      });
    });
  });

  describe('findOne', () => {
    it('returns employee when found', async () => {
      repository.findOne.mockResolvedValue(mockEmployee);

      const result = await service.findOne(employeeId);

      expect(result).toEqual(mockEmployee);
    });

    it('throws NotFoundException when employee does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(employeeId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates and saves employee', async () => {
      const dto: CreateEmployeeDto = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@example.com',
        department: 'Engineering',
      };

      repository.create.mockReturnValue(mockEmployee);
      repository.save.mockResolvedValue(mockEmployee);

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockEmployee);
    });
  });

  describe('update', () => {
    it('updates employee fields', async () => {
      const updateDto: UpdateEmployeeDto = { department: 'Design' };
      const updated = { ...mockEmployee, department: 'Design' };

      repository.findOne.mockResolvedValue({ ...mockEmployee });
      repository.save.mockResolvedValue(updated);

      const result = await service.update(employeeId, updateDto);

      expect(result.department).toBe('Design');
    });
  });

  describe('remove', () => {
    it('removes employee when found', async () => {
      repository.findOne.mockResolvedValue(mockEmployee);
      repository.remove.mockResolvedValue(mockEmployee);

      await service.remove(employeeId);

      expect(repository.remove).toHaveBeenCalledWith(mockEmployee);
    });
  });
});
