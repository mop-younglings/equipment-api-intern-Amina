import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { DataSource, Repository } from 'typeorm';
import { ApprovalStep } from '../../modules/approval/entities/approval-step.entity';
import { ApprovalStepStatus } from '../../modules/approval/enums/approval-step-status.enum';
import { EmployeeRole } from '../../modules/employee/enums/employee-role.enum';
import { Employee } from '../../modules/employee/entities/employee.entity';
import { Equipment } from '../../modules/equipment/entities/equipment.entity';
import { EquipmentStatus } from '../../modules/equipment/enums/equipment-status.enum';
import { Notification } from '../../modules/notification/entities/notification.entity';
import { NotificationType } from '../../modules/notification/enums/notification-type.enum';
import { EquipmentRequest } from '../../modules/request/entities/equipment-request.entity';
import { RequestStatus } from '../../modules/request/enums/request-status.enum';

config();

const DEMO_PASSWORD = 'password123';
const ADMIN_EMAIL = 'admin@example.com';
const SALT_ROUNDS = 10;

async function seedAdminUser(
  employeeRepository: Repository<Employee>,
): Promise<Employee> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);
  const existing = await employeeRepository.findOne({
    where: { email: ADMIN_EMAIL },
  });

  if (existing) {
    existing.password = passwordHash;
    existing.role = EmployeeRole.ADMIN;
    return employeeRepository.save(existing);
  }

  return employeeRepository.save(
    employeeRepository.create({
      firstName: 'Admin',
      lastName: 'User',
      email: ADMIN_EMAIL,
      department: 'IT',
      password: passwordHash,
      role: EmployeeRole.ADMIN,
    }),
  );
}

async function seed(): Promise<void> {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5433', 10),
    username: process.env.DB_USERNAME ?? 'equipment',
    password: process.env.DB_PASSWORD ?? 'equipment',
    database: process.env.DB_NAME ?? 'equipment_api',
    entities: [
      Employee,
      Equipment,
      EquipmentRequest,
      ApprovalStep,
      Notification,
    ],
  });

  await dataSource.initialize();

  const employeeRepository = dataSource.getRepository(Employee);
  const equipmentRepository = dataSource.getRepository(Equipment);
  const requestRepository = dataSource.getRepository(EquipmentRequest);
  const approvalStepRepository = dataSource.getRepository(ApprovalStep);
  const notificationRepository = dataSource.getRepository(Notification);

  const admin = await seedAdminUser(employeeRepository);
  console.log(`Admin user ready: ${ADMIN_EMAIL} / ${DEMO_PASSWORD}`);

  const hasDemoData = await employeeRepository.existsBy({
    email: 'bob.manager@example.com',
  });
  if (hasDemoData) {
    console.log('Demo seed skipped: demo data already exists.');
    await dataSource.destroy();
    return;
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);

  const bob = await employeeRepository.save(
    employeeRepository.create({
      firstName: 'Bob',
      lastName: 'Manager',
      email: 'bob.manager@example.com',
      department: 'Engineering',
      password: passwordHash,
      role: EmployeeRole.USER,
    }),
  );

  const jane = await employeeRepository.save(
    employeeRepository.create({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@example.com',
      department: 'Engineering',
      password: passwordHash,
      role: EmployeeRole.USER,
      manager: bob,
    }),
  );

  const john = await employeeRepository.save(
    employeeRepository.create({
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@example.com',
      department: 'Design',
      password: passwordHash,
      role: EmployeeRole.USER,
      manager: bob,
    }),
  );

  const macbook = await equipmentRepository.save(
    equipmentRepository.create({
      name: 'MacBook Pro 14"',
      category: 'Computer',
      description: 'M3, 16GB RAM',
      status: EquipmentStatus.IN_USE,
      value: 2499.99,
      assignedEmployee: jane,
    }),
  );

  const monitor = await equipmentRepository.save(
    equipmentRepository.create({
      name: 'Dell UltraSharp 27"',
      category: 'Monitor',
      status: EquipmentStatus.IN_USE,
      value: 449.99,
      assignedEmployee: john,
    }),
  );

  const iphone = await equipmentRepository.save(
    equipmentRepository.create({
      name: 'iPhone 15',
      category: 'Phone',
      status: EquipmentStatus.AVAILABLE,
      value: 799.99,
    }),
  );

  const ipad = await equipmentRepository.save(
    equipmentRepository.create({
      name: 'iPad Pro 12.9"',
      category: 'Tablet',
      description: 'M2, 256GB — high-value item',
      status: EquipmentStatus.AVAILABLE,
      value: 1299.99,
    }),
  );

  // Standard request: John wants iPhone (single manager approval, pending)
  const phoneRequest = await requestRepository.save(
    requestRepository.create({
      requester: john,
      equipment: iphone,
      reason: 'Need company phone for client site visits',
      status: RequestStatus.PENDING,
      equipmentValue: Number(iphone.value),
      requiredApprovalLevels: 1,
    }),
  );

  await approvalStepRepository.save(
    approvalStepRepository.create({
      request: phoneRequest,
      level: 1,
      approver: bob,
      status: ApprovalStepStatus.PENDING,
    }),
  );

  const phoneApprovalStep = await approvalStepRepository.findOneOrFail({
    where: { request: { id: phoneRequest.id }, level: 1 },
    relations: { approver: true },
  });

  // High-value request: Jane wants iPad (manager approved, awaiting admin)
  const tabletRequest = await requestRepository.save(
    requestRepository.create({
      requester: jane,
      equipment: ipad,
      reason: 'Need tablet for design reviews on-site',
      status: RequestStatus.PARTIALLY_APPROVED,
      equipmentValue: Number(ipad.value),
      requiredApprovalLevels: 2,
    }),
  );

  await approvalStepRepository.save([
    approvalStepRepository.create({
      request: tabletRequest,
      level: 1,
      approver: bob,
      status: ApprovalStepStatus.APPROVED,
      comment: 'Approved — valid business need',
      actedAt: new Date(),
    }),
    approvalStepRepository.create({
      request: tabletRequest,
      level: 2,
      approver: admin,
      status: ApprovalStepStatus.PENDING,
    }),
  ]);

  const tabletAdminStep = await approvalStepRepository.findOneOrFail({
    where: { request: { id: tabletRequest.id }, level: 2 },
    relations: { approver: true },
  });

  await notificationRepository.save([
    notificationRepository.create({
      recipient: bob,
      type: NotificationType.APPROVAL_REQUIRED,
      title: `Approval required: ${iphone.name}`,
      message: `${john.firstName} ${john.lastName} requested ${iphone.name} and needs your approval.`,
      request: phoneRequest,
      approvalStep: phoneApprovalStep,
      isRead: false,
    }),
    notificationRepository.create({
      recipient: admin,
      type: NotificationType.APPROVAL_REQUIRED,
      title: `Approval required: ${ipad.name}`,
      message: `${jane.firstName} ${jane.lastName} requested ${ipad.name} and needs your approval.`,
      request: tabletRequest,
      approvalStep: tabletAdminStep,
      isRead: false,
    }),
    notificationRepository.create({
      recipient: jane,
      type: NotificationType.REQUEST_UPDATE,
      title: `Request update: ${ipad.name}`,
      message: `Your request for ${ipad.name} was approved at level 1 and is awaiting further approval.`,
      request: tabletRequest,
      isRead: true,
      readAt: new Date(),
    }),
  ]);

  console.log('Demo seed completed:');
  console.log(`  Users: admin, ${bob.email}, ${jane.email}, ${john.email}`);
  console.log(`  Password for all demo users: ${DEMO_PASSWORD}`);
  console.log(
    `  Equipment: ${macbook.name}, ${monitor.name}, ${iphone.name}, ${ipad.name}`,
  );
  console.log('  Pending approvals:');
  console.log(`    - Bob: iPhone request from John (level 1)`);
  console.log(
    `    - Admin: iPad request from Jane (level 2, manager already approved)`,
  );
  console.log('  Notifications:');
  console.log(`    - Bob: unread approval required for iPhone request`);
  console.log(`    - Admin: unread approval required for iPad request`);
  console.log(`    - Jane: read update on iPad request progress`);

  await dataSource.destroy();
}

seed().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
