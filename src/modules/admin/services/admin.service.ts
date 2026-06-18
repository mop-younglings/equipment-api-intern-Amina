import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Department } from '../../department/entities/department.entity';
import { Employee } from '../../employee/entities/employee.entity';
import { AccountStatus } from '../../employee/enums/account-status.enum';
import { EmployeeRole } from '../../employee/enums/employee-role.enum';
import {
  CreateAdminUserDto,
  ResetPasswordDto,
  UpdateAdminUserDto,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
} from '../dto/admin.dto';

@Injectable()
export class AdminService {
  private readonly saltRounds = 10;

  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) {}

  findAllUsers(): Promise<Employee[]> {
    return this.employeeRepository.find({
      relations: { department: true },
      order: { createdAt: 'ASC' },
    });
  }

  async findUser(id: string): Promise<Employee> {
    const user = await this.employeeRepository.findOne({
      where: { id },
      relations: { department: true },
    });
    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }
    return user;
  }

  async createUser(dto: CreateAdminUserDto): Promise<Employee> {
    const existing = await this.employeeRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    let department: Department | undefined;
    if (dto.departmentId) {
      department =
        (await this.departmentRepository.findOne({
          where: { id: dto.departmentId },
        })) ?? undefined;
      if (!department) {
        throw new NotFoundException('Department not found');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);
    const user = this.employeeRepository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: passwordHash,
      role: dto.role ?? EmployeeRole.EMPLOYEE,
      accountStatus: dto.accountStatus ?? AccountStatus.ACTIVE,
      department,
    });

    return this.employeeRepository.save(user);
  }

  async updateUser(id: string, dto: UpdateAdminUserDto): Promise<Employee> {
    const user = await this.findUser(id);
    if (dto.firstName) user.firstName = dto.firstName;
    if (dto.lastName) user.lastName = dto.lastName;
    if (dto.email) user.email = dto.email;
    if (dto.departmentId !== undefined) {
      if (dto.departmentId === null) {
        user.department = undefined;
      } else {
        const department = await this.departmentRepository.findOne({
          where: { id: dto.departmentId },
        });
        if (!department) {
          throw new NotFoundException('Department not found');
        }
        user.department = department;
      }
    }
    return this.employeeRepository.save(user);
  }

  async updateRole(id: string, dto: UpdateUserRoleDto): Promise<Employee> {
    const user = await this.findUser(id);
    user.role = dto.role;
    return this.employeeRepository.save(user);
  }

  async updateStatus(id: string, dto: UpdateUserStatusDto): Promise<Employee> {
    const user = await this.findUser(id);
    user.accountStatus = dto.accountStatus;
    return this.employeeRepository.save(user);
  }

  async resetPassword(id: string, dto: ResetPasswordDto): Promise<void> {
    const user = await this.findUser(id);
    user.password = await bcrypt.hash(dto.password, this.saltRounds);
    await this.employeeRepository.save(user);
  }

  async removeUser(id: string): Promise<void> {
    const user = await this.findUser(id);
    await this.employeeRepository.remove(user);
  }
}
