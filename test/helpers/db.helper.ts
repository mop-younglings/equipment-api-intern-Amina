import { config } from 'dotenv';
import { DataSource } from 'typeorm';

config();

export function createTestDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5433', 10),
    username: process.env.DB_USERNAME ?? 'equipment',
    password: process.env.DB_PASSWORD ?? 'equipment',
    database: process.env.DB_NAME ?? 'equipment_api',
    entities: ['src/modules/**/*.entity.ts'],
    migrations: ['src/database/migrations/*.ts'],
  });
}

export async function runMigrations(dataSource: DataSource): Promise<void> {
  const pending = await dataSource.showMigrations();
  if (pending) {
    await dataSource.runMigrations();
  }
}

export async function cleanDatabase(dataSource: DataSource): Promise<void> {
  await dataSource.query(`
    TRUNCATE TABLE
      "notifications",
      "request_alternatives",
      "equipment_assignments",
      "approval_steps",
      "equipment_requests",
      "equipment_assets",
      "equipment_models",
      "equipment_categories",
      "employees",
      "departments"
    RESTART IDENTITY CASCADE
  `);
}

export async function isDatabaseAvailable(): Promise<boolean> {
  const dataSource = createTestDataSource();
  try {
    await dataSource.initialize();
    await dataSource.destroy();
    return true;
  } catch {
    return false;
  }
}
