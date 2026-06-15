import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { DataSource, Repository } from 'typeorm';
import { EmployeeRole } from '../../modules/employee/enums/employee-role.enum';
import { Employee } from '../../modules/employee/entities/employee.entity';
import { Equipment } from '../../modules/equipment/entities/equipment.entity';
import { EquipmentStatus } from '../../modules/equipment/enums/equipment-status.enum';

config();

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';
const SALT_ROUNDS = 10;

async function seedAdminUser(
  employeeRepository: Repository<Employee>,
): Promise<void> {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);
  const existing = await employeeRepository.findOne({
    where: { email: ADMIN_EMAIL },
  });

  if (existing) {
    existing.password = passwordHash;
    existing.role = EmployeeRole.ADMIN;
    await employeeRepository.save(existing);
    console.log(`Admin user updated: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    return;
  }

  const admin = employeeRepository.create({
    firstName: 'Admin',
    lastName: 'User',
    email: ADMIN_EMAIL,
    department: 'IT',
    password: passwordHash,
    role: EmployeeRole.ADMIN,
  });

  await employeeRepository.save(admin);
  console.log(`Admin user created: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

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

  await seedAdminUser(employeeRepository);

  const hasDemoData = await employeeRepository.existsBy({
    email: 'jane.doe@example.com',
  });
  if (hasDemoData) {
    console.log('Demo seed skipped: demo employees already exist.');
    await dataSource.destroy();
    return;
  }

  const jane = employeeRepository.create({
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@example.com',
    department: 'Engineering',
    password: '',
    role: EmployeeRole.USER,
  });

  const john = employeeRepository.create({
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@example.com',
    department: 'Design',
    password: '',
    role: EmployeeRole.USER,
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
