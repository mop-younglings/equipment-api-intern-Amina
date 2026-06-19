import { INestApplication } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { Department } from '../src/modules/department/entities/department.entity';
import { AccountStatus } from '../src/modules/employee/enums/account-status.enum';
import { EmployeeRole } from '../src/modules/employee/enums/employee-role.enum';
import { Employee } from '../src/modules/employee/entities/employee.entity';
import { EquipmentAsset } from '../src/modules/equipment-asset/entities/equipment-asset.entity';
import { EquipmentAssetStatus } from '../src/modules/equipment-asset/enums/equipment-asset-status.enum';
import { EquipmentCategory } from '../src/modules/equipment-category/entities/equipment-category.entity';
import { EquipmentModel } from '../src/modules/equipment-model/entities/equipment-model.entity';
import { NotificationType } from '../src/modules/notification/enums/notification-type.enum';
import { RequestStatus } from '../src/modules/request/enums/request-status.enum';
import { RequestType } from '../src/modules/request/enums/request-type.enum';
import {
  cleanDatabase,
  createTestDataSource,
  isDatabaseAvailable,
  runMigrations,
} from './helpers/db.helper';
import { createE2eApp } from './helpers/e2e-app.helper';

const DEMO_PASSWORD = 'password123';

interface TestFixtures {
  admin: Employee;
  procurementManager: Employee;
  manager: Employee;
  employee: Employee;
  department: Department;
  laptopCategory: EquipmentCategory;
  furnitureCategory: EquipmentCategory;
  laptopModel: EquipmentModel;
  availableAsset: EquipmentAsset;
  unusedAsset: EquipmentAsset;
}

describe('Equipment workflow (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let fixtures: TestFixtures;
  let dbAvailable = false;

  beforeAll(async () => {
    dbAvailable = await isDatabaseAvailable();
    if (!dbAvailable) {
      console.warn(
        'Skipping e2e tests: PostgreSQL not available on configured host/port.',
      );
      return;
    }

    dataSource = createTestDataSource();
    await dataSource.initialize();
    await runMigrations(dataSource);
    app = await createE2eApp();
  });

  beforeEach(async () => {
    if (!dbAvailable) return;
    await cleanDatabase(dataSource);
    fixtures = await seedFixtures(dataSource);
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    if (app) {
      await app.close();
    }
  });

  const login = async (
    email: string,
    password = DEMO_PASSWORD,
  ): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    return response.body.accessToken as string;
  };

  const createLoanRequest = async (token: string) => {
    return request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({
        requestType: RequestType.LOAN,
        equipmentModelId: fixtures.laptopModel.id,
        startDate: '2026-07-01',
        endDate: '2026-12-31',
        purpose: 'Development work',
      })
      .expect(201);
  };

  const createProcurementRequest = async (token: string) => {
    return request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({
        requestType: RequestType.PROCUREMENT,
        requestedItemName: 'Standing desk',
        categoryId: fixtures.furnitureCategory.id,
        quantity: 1,
        startDate: '2026-07-01',
        endDate: '2026-12-31',
        purpose: 'Office ergonomics',
      })
      .expect(201);
  };

  const approveManagerStep = async (managerToken: string) => {
    const pending = await request(app.getHttpServer())
      .get('/approvals/my')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(pending.body.length).toBeGreaterThan(0);

    await request(app.getHttpServer())
      .patch(`/approvals/${pending.body[0].id}/approve`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ comment: 'Manager approved' })
      .expect(200);

    return pending.body[0].id as string;
  };

  const approveProcurementStep = async (procurementToken: string) => {
    const pending = await request(app.getHttpServer())
      .get('/approvals/my')
      .set('Authorization', `Bearer ${procurementToken}`)
      .expect(200);

    expect(pending.body.length).toBeGreaterThan(0);

    await request(app.getHttpServer())
      .patch(`/approvals/${pending.body[0].id}/approve`)
      .set('Authorization', `Bearer ${procurementToken}`)
      .send({ comment: 'Procurement approved' })
      .expect(200);
  };

  it('completes loan request through manager and procurement approval with assignment', async () => {
    if (!dbAvailable) return;

    const employeeToken = await login(fixtures.employee.email);
    const createResponse = await createLoanRequest(employeeToken);

    expect(createResponse.body.status).toBe(
      RequestStatus.PENDING_MANAGER_APPROVAL,
    );
    expect(createResponse.body.approvalSteps).toHaveLength(1);

    const managerToken = await login(fixtures.manager.email);
    await approveManagerStep(managerToken);

    const afterManager = await request(app.getHttpServer())
      .get(`/requests/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(200);

    expect(afterManager.body.status).toBe(
      RequestStatus.PENDING_PROCUREMENT_APPROVAL,
    );

    const procurementToken = await login(fixtures.procurementManager.email);
    await approveProcurementStep(procurementToken);

    const fulfilled = await request(app.getHttpServer())
      .get(`/requests/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(200);

    expect(fulfilled.body.status).toBe(RequestStatus.FULFILLED);

    const assignments = await request(app.getHttpServer())
      .get('/equipment-assignments/my')
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(200);

    expect(assignments.body).toHaveLength(1);
    expect(assignments.body[0].status).toBe('active');
  });

  it('completes procurement request after approval, inventory add, and assignment', async () => {
    if (!dbAvailable) return;

    const employeeToken = await login(fixtures.employee.email);
    const createResponse = await createProcurementRequest(employeeToken);
    const requestId = createResponse.body.id as string;

    const managerToken = await login(fixtures.manager.email);
    await approveManagerStep(managerToken);

    const procurementToken = await login(fixtures.procurementManager.email);
    await approveProcurementStep(procurementToken);

    const approvedResponse = await request(app.getHttpServer())
      .get(`/requests/${requestId}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(200);

    expect(approvedResponse.body.status).toBe(
      RequestStatus.PROCUREMENT_APPROVED,
    );

    const modelResponse = await request(app.getHttpServer())
      .post('/equipment-models')
      .set('Authorization', `Bearer ${procurementToken}`)
      .send({
        name: 'Standing desk model',
        categoryId: fixtures.furnitureCategory.id,
        lowStockThreshold: 1,
      })
      .expect(201);

    const modelId = modelResponse.body.id as string;

    const assetResponse = await request(app.getHttpServer())
      .post('/equipment-assets')
      .set('Authorization', `Bearer ${procurementToken}`)
      .send({
        equipmentModelId: modelId,
        assetTag: 'DESK-001',
        status: EquipmentAssetStatus.AVAILABLE,
      })
      .expect(201);

    const assetId = assetResponse.body.id as string;

    await request(app.getHttpServer())
      .post(`/equipment-assets/${assetId}/assign`)
      .set('Authorization', `Bearer ${procurementToken}`)
      .send({
        employeeId: fixtures.employee.id,
        requestId,
      })
      .expect(201);

    const fulfilledResponse = await request(app.getHttpServer())
      .get(`/requests/${requestId}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(200);

    expect(fulfilledResponse.body.status).toBe(RequestStatus.FULFILLED);
    expect(fulfilledResponse.body.assignments).toHaveLength(1);
  });

  it('cancels a pending request', async () => {
    if (!dbAvailable) return;

    const employeeToken = await login(fixtures.employee.email);
    const createResponse = await createLoanRequest(employeeToken);

    const cancelResponse = await request(app.getHttpServer())
      .patch(`/requests/${createResponse.body.id}/cancel`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ reason: 'No longer needed' })
      .expect(200);

    expect(cancelResponse.body.status).toBe(RequestStatus.CANCELLED);
    expect(cancelResponse.body.cancellationReason).toBe('No longer needed');
  });

  it('rejects request at manager level with reason', async () => {
    if (!dbAvailable) return;

    const employeeToken = await login(fixtures.employee.email);
    const createResponse = await createLoanRequest(employeeToken);

    const managerToken = await login(fixtures.manager.email);
    const pending = await request(app.getHttpServer())
      .get('/approvals/my')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/approvals/${pending.body[0].id}/reject`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ comment: 'Budget not available' })
      .expect(200);

    const requestResponse = await request(app.getHttpServer())
      .get(`/requests/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(200);

    expect(requestResponse.body.status).toBe(RequestStatus.REJECTED);
    expect(requestResponse.body.rejectedReason).toBe('Budget not available');
  });

  it('rejects request at procurement level with reason', async () => {
    if (!dbAvailable) return;

    const employeeToken = await login(fixtures.employee.email);
    const createResponse = await createLoanRequest(employeeToken);

    const managerToken = await login(fixtures.manager.email);
    await approveManagerStep(managerToken);

    const procurementToken = await login(fixtures.procurementManager.email);
    const pending = await request(app.getHttpServer())
      .get('/approvals/my')
      .set('Authorization', `Bearer ${procurementToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/approvals/${pending.body[0].id}/reject`)
      .set('Authorization', `Bearer ${procurementToken}`)
      .send({ comment: 'No stock available' })
      .expect(200);

    const requestResponse = await request(app.getHttpServer())
      .get(`/requests/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(200);

    expect(requestResponse.body.status).toBe(RequestStatus.REJECTED);
    expect(requestResponse.body.rejectedReason).toBe('No stock available');
  });

  it('handles equipment return request and completion', async () => {
    if (!dbAvailable) return;

    const employeeToken = await login(fixtures.employee.email);
    await createLoanRequest(employeeToken);

    const managerToken = await login(fixtures.manager.email);
    await approveManagerStep(managerToken);

    const procurementToken = await login(fixtures.procurementManager.email);
    await approveProcurementStep(procurementToken);

    const assignments = await request(app.getHttpServer())
      .get('/equipment-assignments/my')
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(200);

    const assignmentId = assignments.body[0].id as string;

    await request(app.getHttpServer())
      .post(`/equipment-assignments/${assignmentId}/return-request`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        returnByDate: '2026-08-15',
        message: 'Please return for inventory',
      })
      .expect(201);

    const returnComplete = await request(app.getHttpServer())
      .patch(`/equipment-assignments/${assignmentId}/complete-return`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(200);

    expect(returnComplete.body.status).toBe('returned');
  });

  it('enforces asset delete and retire rules', async () => {
    if (!dbAvailable) return;

    const procurementToken = await login(fixtures.procurementManager.email);

    await request(app.getHttpServer())
      .delete(`/equipment-assets/${fixtures.unusedAsset.id}`)
      .set('Authorization', `Bearer ${procurementToken}`)
      .expect(200);

    const retireResponse = await request(app.getHttpServer())
      .patch(`/equipment-assets/${fixtures.availableAsset.id}/retire`)
      .set('Authorization', `Bearer ${procurementToken}`)
      .expect(200);

    expect(retireResponse.body.status).toBe(EquipmentAssetStatus.RETIRED);

    await request(app.getHttpServer())
      .delete(`/equipment-assets/${fixtures.availableAsset.id}`)
      .set('Authorization', `Bearer ${procurementToken}`)
      .expect(400);
  });

  it('allows admin to change role and deactivate users', async () => {
    if (!dbAvailable) return;

    const adminToken = await login(fixtures.admin.email);

    const roleResponse = await request(app.getHttpServer())
      .patch(`/admin/users/${fixtures.employee.id}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: EmployeeRole.DIRECT_MANAGER })
      .expect(200);

    expect(roleResponse.body.role).toBe(EmployeeRole.DIRECT_MANAGER);

    await request(app.getHttpServer())
      .patch(`/admin/users/${fixtures.employee.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ accountStatus: AccountStatus.INACTIVE })
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: fixtures.employee.email, password: DEMO_PASSWORD })
      .expect(401);
  });

  it('rotates refresh tokens and preserves authenticated access', async () => {
    if (!dbAvailable) return;

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: fixtures.employee.email, password: DEMO_PASSWORD })
      .expect(200);

    expect(loginResponse.body.refreshToken).toBeTruthy();

    const oldRefreshToken = loginResponse.body.refreshToken as string;

    const refreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: oldRefreshToken })
      .expect(200);

    const newAccessToken = refreshResponse.body.accessToken as string;
    const newRefreshToken = refreshResponse.body.refreshToken as string;

    expect(newAccessToken).toBeTruthy();
    expect(newRefreshToken).not.toBe(oldRefreshToken);

    await request(app.getHttpServer())
      .get('/requests/my')
      .set('Authorization', `Bearer ${newAccessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/logout')
      .send({ refreshToken: newRefreshToken })
      .expect(204);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: newRefreshToken })
      .expect(401);
  });

  it('enforces role-based access restrictions', async () => {
    if (!dbAvailable) return;

    const employeeToken = await login(fixtures.employee.email);

    await request(app.getHttpServer())
      .get('/procurement/approvals')
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/admin/users')
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/inventory')
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(403);
  });

  it('creates notifications throughout the workflow', async () => {
    if (!dbAvailable) return;

    const employeeToken = await login(fixtures.employee.email);
    await createLoanRequest(employeeToken);

    const managerToken = await login(fixtures.manager.email);
    const managerNotifications = await request(app.getHttpServer())
      .get('/notifications')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(managerNotifications.body.length).toBeGreaterThan(0);
    expect(managerNotifications.body[0].type).toBe(
      NotificationType.APPROVAL_REQUIRED,
    );

    await approveManagerStep(managerToken);

    const employeeNotifications = await request(app.getHttpServer())
      .get('/notifications')
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(200);

    const updateNotification = (
      employeeNotifications.body as Array<{ type: NotificationType }>
    ).find((n) => n.type === NotificationType.REQUEST_UPDATE);
    expect(updateNotification).toBeDefined();
  });
});

async function seedFixtures(dataSource: DataSource): Promise<TestFixtures> {
  const employeeRepo = dataSource.getRepository(Employee);
  const departmentRepo = dataSource.getRepository(Department);
  const categoryRepo = dataSource.getRepository(EquipmentCategory);
  const modelRepo = dataSource.getRepository(EquipmentModel);
  const assetRepo = dataSource.getRepository(EquipmentAsset);
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const admin = await employeeRepo.save(
    employeeRepo.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@ministryofprogramming.com',
      password: passwordHash,
      role: EmployeeRole.ADMIN,
      accountStatus: AccountStatus.ACTIVE,
    }),
  );

  const procurementManager = await employeeRepo.save(
    employeeRepo.create({
      firstName: 'Pat',
      lastName: 'Procurement',
      email: 'procurement@ministryofprogramming.com',
      password: passwordHash,
      role: EmployeeRole.PROCUREMENT_MANAGER,
      accountStatus: AccountStatus.ACTIVE,
    }),
  );

  const manager = await employeeRepo.save(
    employeeRepo.create({
      firstName: 'Bob',
      lastName: 'Manager',
      email: 'manager@ministryofprogramming.com',
      password: passwordHash,
      role: EmployeeRole.DIRECT_MANAGER,
      accountStatus: AccountStatus.ACTIVE,
    }),
  );

  const department = await departmentRepo.save(
    departmentRepo.create({
      name: 'Engineering',
      directManager: manager,
    }),
  );

  const employee = await employeeRepo.save(
    employeeRepo.create({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'employee@ministryofprogramming.com',
      password: passwordHash,
      role: EmployeeRole.EMPLOYEE,
      accountStatus: AccountStatus.ACTIVE,
      department,
    }),
  );

  const laptopCategory = await categoryRepo.save(
    categoryRepo.create({ name: 'Laptop', description: 'Portable computers' }),
  );

  const furnitureCategory = await categoryRepo.save(
    categoryRepo.create({ name: 'Furniture', description: 'Office furniture' }),
  );

  const laptopModel = await modelRepo.save(
    modelRepo.create({
      name: 'MacBook Pro 14"',
      category: laptopCategory,
      lowStockThreshold: 1,
    }),
  );

  const availableAsset = await assetRepo.save(
    assetRepo.create({
      equipmentModel: laptopModel,
      assetTag: 'MBP-001',
      status: EquipmentAssetStatus.AVAILABLE,
    }),
  );

  const unusedAsset = await assetRepo.save(
    assetRepo.create({
      equipmentModel: laptopModel,
      assetTag: 'MBP-002',
      status: EquipmentAssetStatus.AVAILABLE,
    }),
  );

  return {
    admin,
    procurementManager,
    manager,
    employee,
    department,
    laptopCategory,
    furnitureCategory,
    laptopModel,
    availableAsset,
    unusedAsset,
  };
}
