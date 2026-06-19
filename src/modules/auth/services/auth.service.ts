import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { Department } from '../../department/entities/department.entity';
import { Employee } from '../../employee/entities/employee.entity';
import { AccountStatus } from '../../employee/enums/account-status.enum';
import { EmployeeRole } from '../../employee/enums/employee-role.enum';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { RefreshTokenService } from './refresh-token.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: EmployeeRole;
}

export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly saltRounds = 10;

  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  async register(
    registerDto: RegisterDto,
  ): Promise<Omit<Employee, 'password'>> {
    const existing = await this.employeeRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    let department: Department | undefined;
    if (registerDto.departmentId) {
      department =
        (await this.departmentRepository.findOne({
          where: { id: registerDto.departmentId },
        })) ?? undefined;
    }

    const passwordHash = await bcrypt.hash(
      registerDto.password,
      this.saltRounds,
    );

    const employee = this.employeeRepository.create({
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      email: registerDto.email,
      password: passwordHash,
      role: EmployeeRole.EMPLOYEE,
      accountStatus: AccountStatus.ACTIVE,
      department,
    });

    const saved = await this.employeeRepository.save(employee);
    return this.toPublicEmployee(saved);
  }

  async validateJwtPayload(payload: JwtPayload): Promise<AuthenticatedUser> {
    const employee = await this.employeeRepository.findOne({
      where: { id: payload.sub },
    });

    if (!employee || employee.accountStatus !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return {
      id: employee.id,
      email: employee.email,
      role: employee.role,
    };
  }

  async getProfile(userId: string) {
    const employee = await this.employeeRepository.findOne({
      where: { id: userId },
      relations: { department: { directManager: true } },
    });
    if (!employee) {
      throw new UnauthorizedException('User not found');
    }
    return this.toPublicEmployee(employee);
  }

  async login(loginDto: LoginDto): Promise<AuthTokenResponse> {
    const employee = await this.authenticateCredentials(loginDto);
    return this.issueTokenPair(employee);
  }

  async refresh(refreshToken: string): Promise<AuthTokenResponse> {
    const storedToken =
      await this.refreshTokenService.validateToken(refreshToken);
    const employee = storedToken.employee;

    if (employee.accountStatus !== AccountStatus.ACTIVE) {
      await this.refreshTokenService.revokeToken(refreshToken);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.refreshTokenService.revokeToken(refreshToken);
    return this.issueTokenPair(employee);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.refreshTokenService.revokeToken(refreshToken);
  }

  async revokeAllSessions(employeeId: string): Promise<void> {
    await this.refreshTokenService.revokeAllForEmployee(employeeId);
  }

  private async authenticateCredentials(loginDto: LoginDto): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({
      where: { email: loginDto.email },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        accountStatus: true,
      },
    });

    if (!employee || employee.accountStatus !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      employee.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return employee;
  }

  private async issueTokenPair(employee: Employee): Promise<AuthTokenResponse> {
    const payload: JwtPayload = {
      sub: employee.id,
      email: employee.email,
      role: employee.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.refreshTokenService.issueForEmployee(employee),
    ]);

    return { accessToken, refreshToken };
  }

  private toPublicEmployee(employee: Employee): Omit<Employee, 'password'> {
    const { password: _password, ...publicEmployee } = employee;
    return publicEmployee;
  }
}
