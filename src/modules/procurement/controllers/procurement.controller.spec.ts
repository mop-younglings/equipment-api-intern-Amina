import { Test } from '@nestjs/testing';
import { ProcurementController } from './procurement.controller';
import { ProcurementService } from '../services/procurement.service';
import { RequestService } from '../../request/services/request.service';

describe('ProcurementController', () => {
  const procurementService = {
    checkAvailability: jest.fn(),
  };
  const requestService = { findProcurementPending: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  it('lists procurement approvals', async () => {
    const module = await Test.createTestingModule({
      controllers: [ProcurementController],
      providers: [
        { provide: ProcurementService, useValue: procurementService },
        { provide: RequestService, useValue: requestService },
      ],
    }).compile();
    const controller = module.get(ProcurementController);
    requestService.findProcurementPending.mockResolvedValue([]);
    await controller.pendingApprovals();
    expect(requestService.findProcurementPending).toHaveBeenCalled();
  });
});
