import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { Repository } from 'typeorm';
import { Employee } from '../../employee/entities/employee.entity';
import { AccountStatus } from '../../employee/enums/account-status.enum';
import { EmployeeRole } from '../../employee/enums/employee-role.enum';
import { RefreshToken } from '../entities/refresh-token.entity';
import { RefreshTokenService } from './refresh-token.service';

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;
  let refreshTokenRepository: jest.Mocked<Repository<RefreshToken>>;

  const employee: Employee = {
    id: 'employee-1',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    password: 'hash',
    role: EmployeeRole.EMPLOYEE,
    accountStatus: AccountStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('7d'),
          },
        },
      ],
    }).compile();

    service = module.get(RefreshTokenService);
    refreshTokenRepository = module.get(getRepositoryToken(RefreshToken));
  });

  it('issues a refresh token and stores its hash', async () => {
    refreshTokenRepository.create.mockImplementation(
      (data) => data as RefreshToken,
    );
    refreshTokenRepository.save.mockImplementation(async (record) => record);

    const token = await service.issueForEmployee(employee);

    expect(token).toBeTruthy();
    expect(refreshTokenRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        employee,
        tokenHash: createHash('sha256').update(token).digest('hex'),
      }),
    );
  });

  it('validates an active refresh token', async () => {
    const token = 'valid-refresh-token';
    const storedToken = {
      id: 'token-1',
      employee,
      tokenHash: createHash('sha256').update(token).digest('hex'),
      expiresAt: new Date(Date.now() + 60_000),
    } as RefreshToken;

    refreshTokenRepository.findOne.mockResolvedValue(storedToken);

    await expect(service.validateToken(token)).resolves.toEqual(storedToken);
  });

  it('throws when refresh token is invalid', async () => {
    refreshTokenRepository.findOne.mockResolvedValue(null);

    await expect(service.validateToken('missing-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
