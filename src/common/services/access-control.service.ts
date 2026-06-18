import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuthenticatedUser } from '../types/authenticated-user.type';
import { Department } from '../../modules/department/entities/department.entity';
import { Employee } from '../../modules/employee/entities/employee.entity';
import {
  EmployeeRole,
  hasMinimumRole,
} from '../../modules/employee/enums/employee-role.enum';

@Injectable()
export class AccessControlService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  isAdmin(user: AuthenticatedUser): boolean {
    return user.role === EmployeeRole.ADMIN;
  }

  isProcurementManagerOrAbove(user: AuthenticatedUser): boolean {
    return hasMinimumRole(user.role, EmployeeRole.PROCUREMENT_MANAGER);
  }

  isDirectManagerOrAbove(user: AuthenticatedUser): boolean {
    return hasMinimumRole(user.role, EmployeeRole.DIRECT_MANAGER);
  }

  async getManagedDepartmentIds(userId: string): Promise<string[]> {
    const departments = await this.departmentRepository.find({
      where: { directManager: { id: userId } },
      select: { id: true },
    });
    return departments.map((department) => department.id);
  }

  async isEmployeeInManagedDepartments(
    managerId: string,
    employeeId: string,
  ): Promise<boolean> {
    const managedDepartmentIds = await this.getManagedDepartmentIds(managerId);
    if (!managedDepartmentIds.length) {
      return false;
    }

    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
      relations: { department: true },
    });

    return Boolean(
      employee?.department?.id &&
      managedDepartmentIds.includes(employee.department.id),
    );
  }

  async getDepartmentEmployeeIds(departmentIds: string[]): Promise<string[]> {
    if (!departmentIds.length) {
      return [];
    }

    const employees = await this.employeeRepository.find({
      where: { department: { id: In(departmentIds) } },
      select: { id: true },
    });

    return employees.map((employee) => employee.id);
  }

  async findProcurementManager(): Promise<Employee | null> {
    return this.employeeRepository.findOne({
      where: { role: EmployeeRole.PROCUREMENT_MANAGER },
      order: { createdAt: 'ASC' },
    });
  }
}
