import { Test } from '@nestjs/testing';
import { EmployeeRole } from '../../employee/enums/employee-role.enum';
import {
  EquipmentAssignmentController,
  ManagerController,
} from './equipment-assignment.controller';
import { EquipmentAssignmentService } from '../services/equipment-assignment.service';
import { RequestService } from '../../request/services/request.service';

describe('EquipmentAssignmentController', () => {
  const assignmentService = {
    findMyAssignments: jest.fn(),
    findOne: jest.fn(),
    requestReturn: jest.fn(),
    completeReturn: jest.fn(),
    findTeamEquipment: jest.fn(),
  };
  const requestService = {
    findManagerPending: jest.fn(),
    findManagerRequests: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('lists my assignments', async () => {
    const module = await Test.createTestingModule({
      controllers: [EquipmentAssignmentController],
      providers: [
        { provide: EquipmentAssignmentService, useValue: assignmentService },
      ],
    }).compile();
    const controller = module.get(EquipmentAssignmentController);
    assignmentService.findMyAssignments.mockResolvedValue([]);
    await controller.findMy({
      id: 'u1',
      email: 'a',
      role: EmployeeRole.EMPLOYEE,
    });
    expect(assignmentService.findMyAssignments).toHaveBeenCalledWith('u1');
  });

  it('manager endpoints delegate', async () => {
    const module = await Test.createTestingModule({
      controllers: [ManagerController],
      providers: [
        { provide: EquipmentAssignmentService, useValue: assignmentService },
        { provide: RequestService, useValue: requestService },
      ],
    }).compile();
    const controller = module.get(ManagerController);
    const user = { id: 'm1', email: 'm', role: EmployeeRole.DIRECT_MANAGER };
    await controller.pendingRequests(user);
    expect(requestService.findManagerPending).toHaveBeenCalledWith(user);
  });
});
