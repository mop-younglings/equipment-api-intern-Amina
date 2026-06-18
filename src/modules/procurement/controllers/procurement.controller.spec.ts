import { Test } from '@nestjs/testing';
import { EmployeeRole } from '../../employee/enums/employee-role.enum';
import {
  ProcurementController,
  RequestAlternativeController,
} from './procurement.controller';
import { ProcurementService } from '../services/procurement.service';
import { RequestService } from '../../request/services/request.service';

describe('Procurement controllers', () => {
  const procurementService = {
    checkAvailability: jest.fn(),
    suggestAlternative: jest.fn(),
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

  it('suggests alternative', async () => {
    const module = await Test.createTestingModule({
      controllers: [RequestAlternativeController],
      providers: [
        { provide: ProcurementService, useValue: procurementService },
      ],
    }).compile();
    const controller = module.get(RequestAlternativeController);
    procurementService.suggestAlternative.mockResolvedValue({ id: 'alt1' });
    await controller.suggestAlternative(
      'r1',
      { equipmentModelId: 'm1' },
      { id: 'u1', email: 'p', role: EmployeeRole.PROCUREMENT_MANAGER },
    );
    expect(procurementService.suggestAlternative).toHaveBeenCalled();
  });
});
