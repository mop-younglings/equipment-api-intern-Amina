import { Test } from '@nestjs/testing';
import { DepartmentService } from '../../department/services/department.service';
import { AdminController } from './admin.controller';
import { AdminService } from '../services/admin.service';

describe('AdminController', () => {
  const adminService = {
    findAllUsers: jest.fn(),
    createUser: jest.fn(),
    findUser: jest.fn(),
    updateUser: jest.fn(),
    updateRole: jest.fn(),
    updateStatus: jest.fn(),
    resetPassword: jest.fn(),
    removeUser: jest.fn(),
  };
  const departmentService = {
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('lists users and departments', async () => {
    const module = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: adminService },
        { provide: DepartmentService, useValue: departmentService },
      ],
    }).compile();
    const controller = module.get(AdminController);
    adminService.findAllUsers.mockResolvedValue([]);
    departmentService.findAll.mockResolvedValue([]);
    await controller.findUsers();
    await controller.findDepartments();
    expect(adminService.findAllUsers).toHaveBeenCalled();
    expect(departmentService.findAll).toHaveBeenCalled();
  });
});
