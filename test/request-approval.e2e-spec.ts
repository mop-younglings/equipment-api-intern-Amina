import { INestApplication } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { EmployeeRole } from '../src/modules/employee/enums/employee-role.enum';
import { Employee } from '../src/modules/employee/entities/employee.entity';
import { Equipment } from '../src/modules/equipment/entities/equipment.entity';
import { EquipmentStatus } from '../src/modules/equipment/enums/equipment-status.enum';
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
  manager: Employee;
  employee: Employee;
  standardEquipment: Equipment;
  highValueEquipment: Equipment;
}

describe('Request & Approval flow (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let fixtures: TestFixtures;
  let dbAvailable = false;

  beforeAll(async () => {
    dbAvailable = await isDatabaseAvailable();
    if (!dbAvailable) {
      console.warn(
        'Skipping integration tests: PostgreSQL not available on configured host/port.',
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

  const login = async (email: string, password: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    return response.body.accessToken as string;
  };

  it('creates a standard request and completes single-level approval', async () => {
    if (!dbAvailable) return;

    const token = await login(fixtures.employee.email, DEMO_PASSWORD);

    const createResponse = await request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({
        equipmentId: fixtures.standardEquipment.id,
        reason: 'Need phone for client calls',
      })
      .expect(201);

    expect(createResponse.body.status).toBe('pending');
    expect(createResponse.body.requiredApprovalLevels).toBe(1);
    expect(createResponse.body.approvalSteps).toHaveLength(1);

    const managerToken = await login(fixtures.manager.email, DEMO_PASSWORD);

    const pendingResponse = await request(app.getHttpServer())
      .get('/approvals')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(pendingResponse.body).toHaveLength(1);

    const stepId = pendingResponse.body[0].id as string;

    await request(app.getHttpServer())
      .patch(`/approvals/${stepId}/approve`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ comment: 'Approved for client work' })
      .expect(200);

    const requestResponse = await request(app.getHttpServer())
      .get(`/requests/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(requestResponse.body.status).toBe('approved');

    const equipmentResponse = await request(app.getHttpServer())
      .get(`/equipment/${fixtures.standardEquipment.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(equipmentResponse.body.status).toBe('in_use');
  });

  it('requires two approval levels for high-value equipment', async () => {
    if (!dbAvailable) return;

    const token = await login(fixtures.employee.email, DEMO_PASSWORD);

    const createResponse = await request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({
        equipmentId: fixtures.highValueEquipment.id,
        reason: 'Need laptop for development',
      })
      .expect(201);

    expect(createResponse.body.requiredApprovalLevels).toBe(2);
    expect(createResponse.body.approvalSteps).toHaveLength(2);

    const managerToken = await login(fixtures.manager.email, DEMO_PASSWORD);
    const managerPending = await request(app.getHttpServer())
      .get('/approvals')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(managerPending.body).toHaveLength(1);

    const managerApproveResponse = await request(app.getHttpServer())
      .patch(`/approvals/${managerPending.body[0].id}/approve`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ comment: 'Manager approved' })
      .expect(200);

    expect(managerApproveResponse.body).toMatchObject({
      status: 'approved',
      level: 1,
    });

    const adminToken = await login(fixtures.admin.email, DEMO_PASSWORD);
    const adminPending = await request(app.getHttpServer())
      .get('/approvals')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(adminPending.body).toHaveLength(1);

    await request(app.getHttpServer())
      .patch(`/approvals/${adminPending.body[0].id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ comment: 'Admin approved' })
      .expect(200);

    const requestResponse = await request(app.getHttpServer())
      .get(`/requests/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(requestResponse.body.status).toBe('approved');
  });

  it('rejects a request and cancels remaining steps', async () => {
    if (!dbAvailable) return;

    const token = await login(fixtures.employee.email, DEMO_PASSWORD);

    const createResponse = await request(app.getHttpServer())
      .post('/requests')
      .send({
        equipmentId: fixtures.highValueEquipment.id,
        reason: 'Need laptop',
      })
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    const managerToken = await login(fixtures.manager.email, DEMO_PASSWORD);
    const pending = await request(app.getHttpServer())
      .get('/approvals')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/approvals/${pending.body[0].id}/reject`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ comment: 'Budget not available this quarter' })
      .expect(200);

    const requestResponse = await request(app.getHttpServer())
      .get(`/requests/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(requestResponse.body.status).toBe('rejected');
  });
});

async function seedFixtures(dataSource: DataSource): Promise<TestFixtures> {
  const employeeRepo = dataSource.getRepository(Employee);
  const equipmentRepo = dataSource.getRepository(Equipment);
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const admin = await employeeRepo.save(
    employeeRepo.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@test.example.com',
      department: 'IT',
      password: passwordHash,
      role: EmployeeRole.ADMIN,
    }),
  );

  const manager = await employeeRepo.save(
    employeeRepo.create({
      firstName: 'Bob',
      lastName: 'Manager',
      email: 'manager@test.example.com',
      department: 'Engineering',
      password: passwordHash,
      role: EmployeeRole.USER,
    }),
  );

  const employee = await employeeRepo.save(
    employeeRepo.create({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'employee@test.example.com',
      department: 'Engineering',
      password: passwordHash,
      role: EmployeeRole.USER,
      manager,
    }),
  );

  const standardEquipment = await equipmentRepo.save(
    equipmentRepo.create({
      name: 'iPhone 15',
      category: 'Phone',
      status: EquipmentStatus.AVAILABLE,
      value: 800,
    }),
  );

  const highValueEquipment = await equipmentRepo.save(
    equipmentRepo.create({
      name: 'MacBook Pro 16"',
      category: 'Computer',
      status: EquipmentStatus.AVAILABLE,
      value: 3200,
    }),
  );

  return { admin, manager, employee, standardEquipment, highValueEquipment };
}
