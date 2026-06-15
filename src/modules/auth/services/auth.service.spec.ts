import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { EmployeeRole } from '../../employee/enums/employee-role.enum';
import { Employee } from '../../employee/entities/employee.entity';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { AuthService, JwtPayload } from './auth.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let employeeRepository: jest.Mocked<Repository<Employee>>;
  let jwtService: jest.Mocked<JwtService>;

  const employeeId = '550e8400-e29b-41d4-a716-446655440000';

  const mockEmployee: Employee = {
    id: employeeId,
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@example.com',
    department: 'Engineering',
    password: 'hashed-password',
    role: EmployeeRole.USER,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const registerDto: RegisterDto = {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@example.com',
    department: 'Engineering',
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
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    employeeRepository = module.get(getRepositoryToken(Employee));
    jwtService = module.get(JwtService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    it('registers a new employee without returning the password', async () => {
      employeeRepository.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      employeeRepository.create.mockReturnValue(mockEmployee);
      employeeRepository.save.mockResolvedValue(mockEmployee);

      const result = await service.register(registerDto);

      expect(employeeRepository.findOne).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(employeeRepository.create).toHaveBeenCalledWith({
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        email: registerDto.email,
        department: registerDto.department,
        password: 'hashed-password',
        role: EmployeeRole.USER,
      });
      expect(result).toEqual({
        id: mockEmployee.id,
        firstName: mockEmployee.firstName,
        lastName: mockEmployee.lastName,
        email: mockEmployee.email,
        department: mockEmployee.department,
        role: mockEmployee.role,
        createdAt: mockEmployee.createdAt,
        updatedAt: mockEmployee.updatedAt,
      });
      expect(result).not.toHaveProperty('password');
    });

    it('throws ConflictException when email is already registered', async () => {
      employeeRepository.findOne.mockResolvedValue(mockEmployee);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'Email already registered',
      );
      expect(employeeRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('returns a JWT access token for valid credentials', async () => {
      employeeRepository.findOne.mockResolvedValue(mockEmployee);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue('signed-jwt-token');

      const result = await service.login(loginDto);

      expect(employeeRepository.findOne).toHaveBeenCalledWith({
        where: { email: loginDto.email },
        select: {
          id: true,
          email: true,
          password: true,
          role: true,
          firstName: true,
          lastName: true,
          department: true,
        },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockEmployee.password,
      );
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: mockEmployee.id,
        email: mockEmployee.email,
        role: mockEmployee.role,
      });
      expect(result).toEqual({ accessToken: 'signed-jwt-token' });
    });

    it('throws UnauthorizedException when email is not found', async () => {
      employeeRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid email or password',
      );
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when password does not match', async () => {
      employeeRepository.findOne.mockResolvedValue(mockEmployee);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid email or password',
      );
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });
  });

  describe('validateJwtPayload', () => {
    const payload: JwtPayload = {
      sub: employeeId,
      email: mockEmployee.email,
      role: EmployeeRole.USER,
    };

    it('returns authenticated user for a valid payload', async () => {
      employeeRepository.findOne.mockResolvedValue(mockEmployee);

      const result = await service.validateJwtPayload(payload);

      expect(employeeRepository.findOne).toHaveBeenCalledWith({
        where: { id: payload.sub },
      });
      expect(result).toEqual({
        id: mockEmployee.id,
        email: mockEmployee.email,
        role: mockEmployee.role,
      });
    });

    it('throws UnauthorizedException when employee no longer exists', async () => {
      employeeRepository.findOne.mockResolvedValue(null);

      await expect(service.validateJwtPayload(payload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.validateJwtPayload(payload)).rejects.toThrow(
        'Invalid or expired token',
      );
    });
  });
});
