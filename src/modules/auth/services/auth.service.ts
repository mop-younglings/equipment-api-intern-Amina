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
import { EmployeeRole } from '../../employee/enums/employee-role.enum';
import { Employee } from '../../employee/entities/employee.entity';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';

export interface JwtPayload {
  sub: string;
  email: string;
  role: EmployeeRole;
}

export interface AuthTokenResponse {
  accessToken: string;
}

@Injectable()
export class AuthService {
  private readonly saltRounds = 10;

  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly jwtService: JwtService,
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

    const passwordHash = await bcrypt.hash(
      registerDto.password,
      this.saltRounds,
    );

    const employee = this.employeeRepository.create({
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      email: registerDto.email,
      department: registerDto.department,
      password: passwordHash,
      role: EmployeeRole.USER,
    });

    const saved = await this.employeeRepository.save(employee);

    return this.toPublicEmployee(saved);
  }

  async validateJwtPayload(payload: JwtPayload): Promise<AuthenticatedUser> {
    const employee = await this.employeeRepository.findOne({
      where: { id: payload.sub },
    });

    if (!employee) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return {
      id: employee.id,
      email: employee.email,
      role: employee.role,
    };
  }

  private toPublicEmployee(employee: Employee): Omit<Employee, 'password'> {
    const { password: _password, ...publicEmployee } = employee;
    return publicEmployee;
  }

  async login(loginDto: LoginDto): Promise<AuthTokenResponse> {
    const employee = await this.employeeRepository.findOne({
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

    if (!employee) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      employee.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: JwtPayload = {
      sub: employee.id,
      email: employee.email,
      role: employee.role,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
    };
  }
}
