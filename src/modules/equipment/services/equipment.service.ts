import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateEquipmentDto } from '../dto/create-equipment.dto';
import { UpdateEquipmentDto } from '../dto/update-equipment.dto';
import { Equipment, EquipmentStatus } from '../entities/equipment.entity';

@Injectable()
export class EquipmentService {
  private equipment: Equipment[] = [
    {
      id: '1',
      name: 'MacBook Pro 14"',
      category: 'Computer',
      description: 'M3, 16GB RAM',
      status: EquipmentStatus.AVAILABLE,
    },
    {
      id: '2',
      name: 'Dell UltraSharp 27"',
      category: 'Monitor',
      status: EquipmentStatus.IN_USE,
    },
  ];

  private nextId = 3;

  findAll(): Equipment[] {
    return this.equipment;
  }

  findOne(id: string): Equipment {
    const item = this.equipment.find((equipment) => equipment.id === id);

    if (!item) {
      throw new NotFoundException(`Equipment with id "${id}" not found`);
    }

    return item;
  }

  create(createEquipmentDto: CreateEquipmentDto): Equipment {
    const item: Equipment = {
      id: String(this.nextId++),
      name: createEquipmentDto.name,
      category: createEquipmentDto.category,
      description: createEquipmentDto.description,
      status: createEquipmentDto.status ?? EquipmentStatus.AVAILABLE,
    };

    this.equipment.push(item);
    return item;
  }

  update(id: string, updateEquipmentDto: UpdateEquipmentDto): Equipment {
    const index = this.equipment.findIndex((equipment) => equipment.id === id);

    if (index === -1) {
      throw new NotFoundException(`Equipment with id "${id}" not found`);
    }

    const updated: Equipment = {
      ...this.equipment[index],
      ...updateEquipmentDto,
    };

    this.equipment[index] = updated;
    return updated;
  }

  remove(id: string): void {
    const index = this.equipment.findIndex((equipment) => equipment.id === id);

    if (index === -1) {
      throw new NotFoundException(`Equipment with id "${id}" not found`);
    }

    this.equipment.splice(index, 1);
  }
}
