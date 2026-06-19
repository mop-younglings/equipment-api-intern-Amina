import { createHash, randomBytes } from 'crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { Employee } from '../../employee/entities/employee.entity';
import { RefreshToken } from '../entities/refresh-token.entity';

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly configService: ConfigService,
  ) {}

  async issueForEmployee(employee: Employee): Promise<string> {
    const token = this.generateToken();
    const record = this.refreshTokenRepository.create({
      employee,
      tokenHash: this.hashToken(token),
      expiresAt: this.getExpiresAt(),
    });
    await this.refreshTokenRepository.save(record);
    return token;
  }

  async validateToken(token: string): Promise<RefreshToken> {
    const record = await this.refreshTokenRepository.findOne({
      where: {
        tokenHash: this.hashToken(token),
        revokedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      relations: { employee: true },
    });

    if (!record) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return record;
  }

  async revokeToken(token: string): Promise<void> {
    const record = await this.refreshTokenRepository.findOne({
      where: { tokenHash: this.hashToken(token) },
    });

    if (!record || record.revokedAt) {
      return;
    }

    record.revokedAt = new Date();
    await this.refreshTokenRepository.save(record);
  }

  async revokeAllForEmployee(employeeId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { employee: { id: employeeId }, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  private generateToken(): string {
    return randomBytes(48).toString('base64url');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getExpiresAt(): Date {
    const expiresIn = this.configService.get<string>(
      'auth.jwtRefreshExpiresIn',
      '7d',
    );
    return this.parseExpiry(expiresIn);
  }

  private parseExpiry(value: string): Date {
    const match = /^(\d+)([smhd])$/.exec(value.trim());
    if (!match) {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    const amount = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return new Date(Date.now() + amount * multipliers[unit]);
  }
}
