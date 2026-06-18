import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeRole } from '../../employee/enums/employee-role.enum';
import { RequestType } from '../enums/request-type.enum';
import { CreateRequestDto } from '../dto/create-request.dto';
import { EquipmentRequest } from '../entities/equipment-request.entity';
import { RequestStatus } from '../enums/request-status.enum';
import { RequestController } from './request.controller';
import { RequestService } from '../services/request.service';

describe('RequestController', () => {
  let controller: RequestController;
  let service: jest.Mocked<RequestService>;

  const user = {
    id: 'user-1',
    email: 'jane@example.com',
    role: EmployeeRole.EMPLOYEE,
  };

  const mockRequest = {
    id: 'req-1',
    status: RequestStatus.PENDING_MANAGER_APPROVAL,
  } as EquipmentRequest;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RequestController],
      providers: [
        {
          provide: RequestService,
          useValue: {
            findMyRequests: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            cancel: jest.fn(),
            getTimeline: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(RequestController);
    service = module.get(RequestService);
  });

  it('delegates findMy to service', async () => {
    service.findMyRequests.mockResolvedValue([mockRequest]);

    const result = await controller.findMy(user);

    expect(result).toEqual([mockRequest]);
    expect(service.findMyRequests).toHaveBeenCalledWith(user.id);
  });

  it('delegates findOne to service', async () => {
    service.findOne.mockResolvedValue(mockRequest);

    const result = await controller.findOne('req-1', user);

    expect(result).toEqual(mockRequest);
    expect(service.findOne).toHaveBeenCalledWith('req-1', user);
  });

  it('delegates create to service', async () => {
    const dto: CreateRequestDto = {
      requestType: RequestType.LOAN,
      equipmentModelId: 'model-1',
      startDate: '2026-07-01',
      endDate: '2026-12-31',
      purpose: 'Need laptop',
    };
    service.create.mockResolvedValue(mockRequest);

    const result = await controller.create(dto, user);

    expect(result).toEqual(mockRequest);
    expect(service.create).toHaveBeenCalledWith(dto, user);
  });

  it('delegates cancel to service', async () => {
    service.cancel.mockResolvedValue({
      ...mockRequest,
      status: RequestStatus.CANCELLED,
    });

    const result = await controller.cancel(
      'req-1',
      { reason: 'No longer needed' },
      user,
    );

    expect(result.status).toBe(RequestStatus.CANCELLED);
    expect(service.cancel).toHaveBeenCalledWith('req-1', user, {
      reason: 'No longer needed',
    });
  });
});
