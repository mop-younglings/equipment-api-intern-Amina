import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Department } from '../../department/entities/department.entity';
import { Employee } from '../../employee/entities/employee.entity';
import { AccountStatus } from '../../employee/enums/account-status.enum';
import { EmployeeRole } from '../../employee/enums/employee-role.enum';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { AuthService, JwtPayload } from './auth.service';
import { RefreshTokenService } from './refresh-token.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let employeeRepository: jest.Mocked<Repository<Employee>>;
  let departmentRepository: jest.Mocked<Repository<Department>>;
  let jwtService: jest.Mocked<JwtService>;
  let refreshTokenService: jest.Mocked<RefreshTokenService>;

  const employeeId = '550e8400-e29b-41d4-a716-446655440000';
  const departmentId = 'dept-1';

  const mockEmployee: Employee = {
    id: employeeId,
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@example.com',
    password: 'hashed-password',
    role: EmployeeRole.EMPLOYEE,
    accountStatus: AccountStatus.ACTIVE,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const registerDto: RegisterDto = {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@example.com',
    departmentId,
    password: 'password123',
  };

  const loginDto: LoginDto = {
    email: 'jane.doe@example.com',
    password: 'password123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(Employee),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Department),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn() },
        },
        {
          provide: RefreshTokenService,
          useValue: {
            issueForEmployee: jest.fn(),
            validateToken: jest.fn(),
            revokeToken: jest.fn(),
            revokeAllForEmployee: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    employeeRepository = module.get(getRepositoryToken(Employee));
    departmentRepository = module.get(getRepositoryToken(Department));
    jwtService = module.get(JwtService);
    refreshTokenService = module.get(RefreshTokenService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    it('registers a new employee without returning the password', async () => {
      employeeRepository.findOne.mockResolvedValue(null);
      departmentRepository.findOne.mockResolvedValue({
        id: departmentId,
        name: 'Engineering',
      } as Department);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      employeeRepository.create.mockReturnValue(mockEmployee);
      employeeRepository.save.mockResolvedValue(mockEmployee);

      const result = await service.register(registerDto);

      expect(employeeRepository.findOne).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(employeeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
          email: registerDto.email,
          role: EmployeeRole.EMPLOYEE,
          accountStatus: AccountStatus.ACTIVE,
        }),
      );
      expect(result).not.toHaveProperty('password');
    });

    it('throws ConflictException when email is already registered', async () => {
      employeeRepository.findOne.mockResolvedValue(mockEmployee);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(employeeRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('returns access and refresh tokens for valid credentials', async () => {
      employeeRepository.findOne.mockResolvedValue(mockEmployee);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue('signed-jwt-token');
      refreshTokenService.issueForEmployee.mockResolvedValue('refresh-token');

      const result = await service.login(loginDto);

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: mockEmployee.id,
        email: mockEmployee.email,
        role: mockEmployee.role,
      });
      expect(refreshTokenService.issueForEmployee).toHaveBeenCalledWith(
        mockEmployee,
      );
      expect(result).toEqual({
        accessToken: 'signed-jwt-token',
        refreshToken: 'refresh-token',
      });
    });

    it('throws UnauthorizedException when account is inactive', async () => {
      employeeRepository.findOne.mockResolvedValue({
        ...mockEmployee,
        accountStatus: AccountStatus.INACTIVE,
      });

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when password does not match', async () => {
      employeeRepository.findOne.mockResolvedValue(mockEmployee);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('rotates refresh token and returns a new token pair', async () => {
      refreshTokenService.validateToken.mockResolvedValue({
        employee: mockEmployee,
      } as never);
      refreshTokenService.revokeToken.mockResolvedValue(undefined);
      jwtService.signAsync.mockResolvedValue('new-access-token');
      refreshTokenService.issueForEmployee.mockResolvedValue(
        'new-refresh-token',
      );

      const result = await service.refresh('old-refresh-token');

      expect(refreshTokenService.validateToken).toHaveBeenCalledWith(
        'old-refresh-token',
      );
      expect(refreshTokenService.revokeToken).toHaveBeenCalledWith(
        'old-refresh-token',
      );
      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
    });

    it('revokes refresh token when employee is inactive', async () => {
      refreshTokenService.validateToken.mockResolvedValue({
        employee: { ...mockEmployee, accountStatus: AccountStatus.INACTIVE },
      } as never);

      await expect(service.refresh('old-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(refreshTokenService.revokeToken).toHaveBeenCalledWith(
        'old-refresh-token',
      );
    });
  });

  describe('logout', () => {
    it('revokes the refresh token', async () => {
      await service.logout('refresh-token');

      expect(refreshTokenService.revokeToken).toHaveBeenCalledWith(
        'refresh-token',
      );
    });
  });

  describe('validateJwtPayload', () => {
    const payload: JwtPayload = {
      sub: employeeId,
      email: mockEmployee.email,
      role: EmployeeRole.EMPLOYEE,
    };

    it('returns authenticated user for a valid payload', async () => {
      employeeRepository.findOne.mockResolvedValue(mockEmployee);

      const result = await service.validateJwtPayload(payload);

      expect(result).toEqual({
        id: mockEmployee.id,
        email: mockEmployee.email,
        role: mockEmployee.role,
      });
    });

    it('throws UnauthorizedException when employee is inactive', async () => {
      employeeRepository.findOne.mockResolvedValue({
        ...mockEmployee,
        accountStatus: AccountStatus.INACTIVE,
      });

      await expect(service.validateJwtPayload(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
