import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { ApprovalStep } from '../../modules/approval/entities/approval-step.entity';
import { ApprovalRole } from '../../modules/approval/enums/approval-role.enum';
import { ApprovalStepStatus } from '../../modules/approval/enums/approval-step-status.enum';
import { Department } from '../../modules/department/entities/department.entity';
import { AccountStatus } from '../../modules/employee/enums/account-status.enum';
import { EmployeeRole } from '../../modules/employee/enums/employee-role.enum';
import { Employee } from '../../modules/employee/entities/employee.entity';
import { EquipmentAsset } from '../../modules/equipment-asset/entities/equipment-asset.entity';
import { EquipmentAssetStatus } from '../../modules/equipment-asset/enums/equipment-asset-status.enum';
import { EquipmentAssignment } from '../../modules/equipment-assignment/entities/equipment-assignment.entity';
import { EquipmentAssignmentStatus } from '../../modules/equipment-assignment/enums/equipment-assignment-status.enum';
import { EquipmentCategory } from '../../modules/equipment-category/entities/equipment-category.entity';
import { EquipmentModel } from '../../modules/equipment-model/entities/equipment-model.entity';
import { Notification } from '../../modules/notification/entities/notification.entity';
import { NotificationType } from '../../modules/notification/enums/notification-type.enum';
import { EquipmentRequest } from '../../modules/request/entities/equipment-request.entity';
import { RequestStatus } from '../../modules/request/enums/request-status.enum';
import { RequestType } from '../../modules/request/enums/request-type.enum';

config();

const DEMO_PASSWORD = 'password123';
const SALT_ROUNDS = 10;

async function seed(): Promise<void> {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5433', 10),
    username: process.env.DB_USERNAME ?? 'equipment',
    password: process.env.DB_PASSWORD ?? 'equipment',
    database: process.env.DB_NAME ?? 'equipment_api',
    entities: ['src/modules/**/*.entity.ts'],
  });

  await dataSource.initialize();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);

  const employeeRepo = dataSource.getRepository(Employee);
  const departmentRepo = dataSource.getRepository(Department);
  const categoryRepo = dataSource.getRepository(EquipmentCategory);
  const modelRepo = dataSource.getRepository(EquipmentModel);
  const assetRepo = dataSource.getRepository(EquipmentAsset);
  const requestRepo = dataSource.getRepository(EquipmentRequest);
  const stepRepo = dataSource.getRepository(ApprovalStep);
  const notificationRepo = dataSource.getRepository(Notification);
  const assignmentRepo = dataSource.getRepository(EquipmentAssignment);

  if (await employeeRepo.existsBy({ email: 'bob.manager@example.com' })) {
    console.log('Demo seed skipped: demo data already exists.');
    await dataSource.destroy();
    return;
  }

  await employeeRepo.save(
    employeeRepo.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      password: passwordHash,
      role: EmployeeRole.ADMIN,
      accountStatus: AccountStatus.ACTIVE,
    }),
  );

  const procurementManager = await employeeRepo.save(
    employeeRepo.create({
      firstName: 'Pat',
      lastName: 'Procurement',
      email: 'pat.procurement@example.com',
      password: passwordHash,
      role: EmployeeRole.PROCUREMENT_MANAGER,
      accountStatus: AccountStatus.ACTIVE,
    }),
  );

  const bob = await employeeRepo.save(
    employeeRepo.create({
      firstName: 'Bob',
      lastName: 'Manager',
      email: 'bob.manager@example.com',
      password: passwordHash,
      role: EmployeeRole.DIRECT_MANAGER,
      accountStatus: AccountStatus.ACTIVE,
    }),
  );

  const engineering = await departmentRepo.save(
    departmentRepo.create({
      name: 'Engineering',
      directManager: bob,
    }),
  );

  const design = await departmentRepo.save(
    departmentRepo.create({
      name: 'Design',
      directManager: bob,
    }),
  );

  const operations = await departmentRepo.save(
    departmentRepo.create({ name: 'Operations' }),
  );

  const jane = await employeeRepo.save(
    employeeRepo.create({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@example.com',
      password: passwordHash,
      role: EmployeeRole.EMPLOYEE,
      accountStatus: AccountStatus.ACTIVE,
      department: engineering,
    }),
  );

  const john = await employeeRepo.save(
    employeeRepo.create({
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@example.com',
      password: passwordHash,
      role: EmployeeRole.EMPLOYEE,
      accountStatus: AccountStatus.ACTIVE,
      department: design,
    }),
  );

  const categories = await categoryRepo.save([
    categoryRepo.create({ name: 'Laptop', description: 'Portable computers' }),
    categoryRepo.create({ name: 'Monitor', description: 'Displays' }),
    categoryRepo.create({ name: 'Phone', description: 'Mobile phones' }),
    categoryRepo.create({ name: 'Tablet', description: 'Tablets' }),
    categoryRepo.create({ name: 'Furniture', description: 'Office furniture' }),
  ]);

  const [laptopCat, monitorCat, phoneCat, tabletCat, furnitureCat] = categories;

  const models = await modelRepo.save([
    modelRepo.create({
      name: 'MacBook Pro 14"',
      category: laptopCat,
      defaultValue: 2499.99,
      lowStockThreshold: 1,
    }),
    modelRepo.create({
      name: 'Dell UltraSharp 27"',
      category: monitorCat,
      defaultValue: 449.99,
      lowStockThreshold: 2,
    }),
    modelRepo.create({
      name: 'iPhone 15',
      category: phoneCat,
      defaultValue: 799.99,
      lowStockThreshold: 2,
    }),
    modelRepo.create({
      name: 'iPad Pro 12.9"',
      category: tabletCat,
      defaultValue: 1299.99,
      lowStockThreshold: 1,
    }),
    modelRepo.create({
      name: 'Standing Desk',
      category: furnitureCat,
      defaultValue: 599.99,
      lowStockThreshold: 1,
    }),
  ]);

  const [macbookModel, monitorModel, iphoneModel, ipadModel] = models;

  const now = new Date();
  const assets = await assetRepo.save([
    assetRepo.create({
      equipmentModel: macbookModel,
      assetTag: 'LT-001',
      serialNumber: 'MBP-001',
      status: EquipmentAssetStatus.IN_USE,
      assignedEmployee: jane,
      assignedAt: now,
      expectedReturnDate: '2026-12-31',
    }),
    assetRepo.create({
      equipmentModel: monitorModel,
      assetTag: 'MON-001',
      status: EquipmentAssetStatus.IN_USE,
      assignedEmployee: john,
      assignedAt: now,
    }),
    assetRepo.create({
      equipmentModel: iphoneModel,
      assetTag: 'PH-001',
      status: EquipmentAssetStatus.AVAILABLE,
    }),
    assetRepo.create({
      equipmentModel: iphoneModel,
      assetTag: 'PH-002',
      status: EquipmentAssetStatus.MAINTENANCE,
    }),
    assetRepo.create({
      equipmentModel: ipadModel,
      assetTag: 'TB-001',
      status: EquipmentAssetStatus.AVAILABLE,
    }),
    assetRepo.create({
      equipmentModel: models[4],
      assetTag: 'FURN-001',
      status: EquipmentAssetStatus.RETIRED,
      retiredAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      retiredBy: procurementManager,
    }),
  ]);

  await assignmentRepo.save([
    assignmentRepo.create({
      equipmentAsset: assets[0],
      employee: jane,
      assignedBy: procurementManager,
      assignedAt: now,
      expectedReturnDate: '2026-12-31',
      status: EquipmentAssignmentStatus.ACTIVE,
    }),
    assignmentRepo.create({
      equipmentAsset: assets[1],
      employee: john,
      assignedBy: procurementManager,
      assignedAt: now,
      status: EquipmentAssignmentStatus.ACTIVE,
    }),
  ]);

  const loanRequest = await requestRepo.save(
    requestRepo.create({
      requester: john,
      requestType: RequestType.LOAN,
      equipmentModel: iphoneModel,
      category: phoneCat,
      quantity: 1,
      startDate: '2026-07-01',
      endDate: '2026-12-31',
      purpose: 'Need company phone for client site visits',
      status: RequestStatus.PENDING_MANAGER_APPROVAL,
    }),
  );

  const loanManagerStep = await stepRepo.save(
    stepRepo.create({
      request: loanRequest,
      level: 1,
      approver: bob,
      approverRole: ApprovalRole.DIRECT_MANAGER,
      status: ApprovalStepStatus.PENDING,
    }),
  );

  const procurementRequest = await requestRepo.save(
    requestRepo.create({
      requester: jane,
      requestType: RequestType.PROCUREMENT,
      requestedItemName: 'Ergonomic standing desk',
      category: furnitureCat,
      quantity: 1,
      startDate: '2026-08-01',
      endDate: '2027-08-01',
      purpose: 'Need adjustable desk for home office setup',
      status: RequestStatus.PENDING_PROCUREMENT_APPROVAL,
    }),
  );

  await stepRepo.save([
    stepRepo.create({
      request: procurementRequest,
      level: 1,
      approver: bob,
      approverRole: ApprovalRole.DIRECT_MANAGER,
      status: ApprovalStepStatus.APPROVED,
      comment: 'Approved business need',
      actedAt: now,
    }),
    stepRepo.create({
      request: procurementRequest,
      level: 2,
      approver: procurementManager,
      approverRole: ApprovalRole.PROCUREMENT_MANAGER,
      status: ApprovalStepStatus.PENDING,
    }),
  ]);

  const procurementStep = await stepRepo.findOneOrFail({
    where: { request: { id: procurementRequest.id }, level: 2 },
  });

  await notificationRepo.save([
    notificationRepo.create({
      recipient: bob,
      type: NotificationType.APPROVAL_REQUIRED,
      title: 'Approval required: iPhone 15',
      message: 'John Smith submitted a loan request for iPhone 15.',
      request: loanRequest,
      approvalStep: loanManagerStep,
    }),
    notificationRepo.create({
      recipient: procurementManager,
      type: NotificationType.APPROVAL_REQUIRED,
      title: 'Approval required: Ergonomic standing desk',
      message: 'Jane Doe procurement request awaits review.',
      request: procurementRequest,
      approvalStep: procurementStep,
    }),
  ]);

  console.log('Seed completed successfully.');
  console.log(`Password for all users: ${DEMO_PASSWORD}`);
  console.log(
    'Users: admin@example.com, pat.procurement@example.com, bob.manager@example.com, jane.doe@example.com, john.smith@example.com',
  );
  console.log(
    `Departments: ${engineering.name}, ${design.name}, ${operations.name}`,
  );
  console.log(
    `Categories: ${categories.length}, Models: ${models.length}, Assets: ${assets.length}`,
  );

  await dataSource.destroy();
}

seed().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
