import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../services/auth.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  const authService = { validateJwtPayload: jest.fn() };
  const configService = {
    getOrThrow: jest.fn().mockReturnValue('test-secret'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: AuthService, useValue: authService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();
    strategy = module.get(JwtStrategy);
    jest.clearAllMocks();
  });

  it('validates payload via auth service', async () => {
    authService.validateJwtPayload.mockResolvedValue({ id: 'u1' });
    await expect(
      strategy.validate({ sub: 'u1', email: 'a@b.com', role: 'employee' }),
    ).resolves.toEqual({ id: 'u1' });
  });

  it('propagates unauthorized errors', async () => {
    authService.validateJwtPayload.mockRejectedValue(
      new UnauthorizedException(),
    );
    await expect(
      strategy.validate({ sub: 'u1', email: 'a@b.com', role: 'employee' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
