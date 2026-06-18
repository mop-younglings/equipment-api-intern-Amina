import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeRole } from '../../employee/enums/employee-role.enum';
import { ApprovalStepStatus } from '../enums/approval-step-status.enum';
import { ApprovalStep } from '../entities/approval-step.entity';
import { ApprovalController } from './approval.controller';
import { ApprovalService } from '../services/approval.service';

describe('ApprovalController', () => {
  let controller: ApprovalController;
  let service: jest.Mocked<ApprovalService>;

  const user = {
    id: 'manager-1',
    email: 'bob@example.com',
    role: EmployeeRole.DIRECT_MANAGER,
  };

  const mockStep = {
    id: 'step-1',
    status: ApprovalStepStatus.APPROVED,
  } as ApprovalStep;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApprovalController],
      providers: [
        {
          provide: ApprovalService,
          useValue: {
            findMyPending: jest.fn(),
            findOne: jest.fn(),
            approve: jest.fn(),
            reject: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(ApprovalController);
    service = module.get(ApprovalService);
  });

  it('delegates findMy to service', async () => {
    service.findMyPending.mockResolvedValue([mockStep]);

    const result = await controller.findMy(user);

    expect(result).toEqual([mockStep]);
    expect(service.findMyPending).toHaveBeenCalledWith(user.id);
  });

  it('delegates approve to service', async () => {
    service.approve.mockResolvedValue(mockStep);

    const result = await controller.approve('step-1', { comment: 'OK' }, user);

    expect(result).toEqual(mockStep);
    expect(service.approve).toHaveBeenCalledWith('step-1', user, {
      comment: 'OK',
    });
  });

  it('delegates reject to service', async () => {
    service.reject.mockResolvedValue({
      ...mockStep,
      status: ApprovalStepStatus.REJECTED,
    });

    const result = await controller.reject(
      'step-1',
      { comment: 'No budget' },
      user,
    );

    expect(result.status).toBe(ApprovalStepStatus.REJECTED);
    expect(service.reject).toHaveBeenCalledWith('step-1', user, {
      comment: 'No budget',
    });
  });
});
