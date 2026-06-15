import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeRole } from '../../employee/enums/employee-role.enum';
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
    role: EmployeeRole.USER,
  };

  const mockRequest = {
    id: 'req-1',
    status: RequestStatus.PENDING,
  } as EquipmentRequest;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RequestController],
      providers: [
        {
          provide: RequestService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(RequestController);
    service = module.get(RequestService);
  });

  it('delegates findAll to service', async () => {
    service.findAll.mockResolvedValue([mockRequest]);

    const result = await controller.findAll(user);

    expect(result).toEqual([mockRequest]);
    expect(service.findAll).toHaveBeenCalledWith(user);
  });

  it('delegates findOne to service', async () => {
    service.findOne.mockResolvedValue(mockRequest);

    const result = await controller.findOne('req-1', user);

    expect(result).toEqual(mockRequest);
    expect(service.findOne).toHaveBeenCalledWith('req-1', user);
  });

  it('delegates create to service', async () => {
    const dto: CreateRequestDto = {
      equipmentId: 'eq-1',
      reason: 'Need laptop',
    };
    service.create.mockResolvedValue(mockRequest);

    const result = await controller.create(dto, user);

    expect(result).toEqual(mockRequest);
    expect(service.create).toHaveBeenCalledWith(dto, user);
  });
});
