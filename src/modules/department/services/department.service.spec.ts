import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Employee } from '../../employee/entities/employee.entity';
import { Department } from '../entities/department.entity';
import { DepartmentService } from './department.service';

describe('DepartmentService', () => {
  let service: DepartmentService;
  const departmentRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };
  const employeeRepo = { findOne: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentService,
        { provide: getRepositoryToken(Department), useValue: departmentRepo },
        { provide: getRepositoryToken(Employee), useValue: employeeRepo },
      ],
    }).compile();
    service = module.get(DepartmentService);
    jest.clearAllMocks();
  });

  it('creates department with manager', async () => {
    employeeRepo.findOne.mockResolvedValue({ id: 'mgr1' });
    departmentRepo.create.mockReturnValue({ name: 'Eng' });
    departmentRepo.save.mockResolvedValue({ id: 'd1', name: 'Eng' });
    const result = await service.create({
      name: 'Eng',
      directManagerId: 'mgr1',
    });
    expect(result.id).toBe('d1');
  });

  it('updates and removes department', async () => {
    const department = { id: 'd1', name: 'Eng' } as Department;
    departmentRepo.findOne.mockResolvedValue(department);
    departmentRepo.save.mockResolvedValue({
      ...department,
      name: 'Engineering',
    });
    const updated = await service.update('d1', { name: 'Engineering' });
    expect(updated.name).toBe('Engineering');
    await service.remove('d1');
    expect(departmentRepo.remove).toHaveBeenCalled();
  });
});
