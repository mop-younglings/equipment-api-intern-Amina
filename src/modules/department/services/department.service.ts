import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../entities/department.entity';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
} from '../dto/department.dto';
import { Employee } from '../../employee/entities/employee.entity';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  findAll(): Promise<Department[]> {
    return this.departmentRepository.find({
      relations: { directManager: true, employees: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Department> {
    const department = await this.departmentRepository.findOne({
      where: { id },
      relations: { directManager: true, employees: true },
    });
    if (!department) {
      throw new NotFoundException(`Department with id "${id}" not found`);
    }
    return department;
  }

  async create(dto: CreateDepartmentDto): Promise<Department> {
    const department = this.departmentRepository.create({ name: dto.name });
    if (dto.directManagerId) {
      const manager = await this.employeeRepository.findOne({
        where: { id: dto.directManagerId },
      });
      if (!manager) {
        throw new NotFoundException('Direct manager not found');
      }
      department.directManager = manager;
    }
    return this.departmentRepository.save(department);
  }

  async update(id: string, dto: UpdateDepartmentDto): Promise<Department> {
    const department = await this.findOne(id);
    if (dto.name) department.name = dto.name;
    if (dto.directManagerId !== undefined) {
      if (dto.directManagerId === null) {
        department.directManager = undefined;
      } else {
        const manager = await this.employeeRepository.findOne({
          where: { id: dto.directManagerId },
        });
        if (!manager) {
          throw new NotFoundException('Direct manager not found');
        }
        department.directManager = manager;
      }
    }
    return this.departmentRepository.save(department);
  }

  async remove(id: string): Promise<void> {
    const department = await this.findOne(id);
    await this.departmentRepository.remove(department);
  }
}
