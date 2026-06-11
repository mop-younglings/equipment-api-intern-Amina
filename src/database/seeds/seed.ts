import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { Employee } from '../../modules/employee/entities/employee.entity';
import { Equipment } from '../../modules/equipment/entities/equipment.entity';
import { EquipmentStatus } from '../../modules/equipment/enums/equipment-status.enum';

config();

async function seed(): Promise<void> {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5433', 10),
    username: process.env.DB_USERNAME ?? 'equipment',
    password: process.env.DB_PASSWORD ?? 'equipment',
    database: process.env.DB_NAME ?? 'equipment_api',
    entities: [Employee, Equipment],
  });

  await dataSource.initialize();

  const employeeRepository = dataSource.getRepository(Employee);
  const equipmentRepository = dataSource.getRepository(Equipment);

  const existingEmployees = await employeeRepository.count();
  if (existingEmployees > 0) {
    console.log('Seed skipped: employees already exist.');
    await dataSource.destroy();
    return;
  }

  const jane = employeeRepository.create({
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@example.com',
    department: 'Engineering',
  });

  const john = employeeRepository.create({
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@example.com',
    department: 'Design',
  });

  await employeeRepository.save([jane, john]);

  const macbook = equipmentRepository.create({
    name: 'MacBook Pro 14"',
    category: 'Computer',
    description: 'M3, 16GB RAM',
    status: EquipmentStatus.IN_USE,
    assignedEmployee: jane,
  });

  const monitor = equipmentRepository.create({
    name: 'Dell UltraSharp 27"',
    category: 'Monitor',
    status: EquipmentStatus.IN_USE,
    assignedEmployee: john,
  });

  const iphone = equipmentRepository.create({
    name: 'iPhone 15',
    category: 'Phone',
    status: EquipmentStatus.AVAILABLE,
  });

  await equipmentRepository.save([macbook, monitor, iphone]);

  console.log('Seed completed: 2 employees and 3 equipment items created.');
  await dataSource.destroy();
}

seed().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
