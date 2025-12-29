import { initializeDatabaseConnection } from './connection.js';
import { createTables } from './schema.js';

export async function initializeDatabase(): Promise<void> {
  const db = initializeDatabaseConnection();
  createTables(db);
}
