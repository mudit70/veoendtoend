export { getDatabase, getDatabase as getDb, initializeDatabaseConnection, closeDatabase, setDatabase } from './connection';
export { createTables } from './schema';
export { initializeDatabase } from './init';

// Re-export getDatabase as db for backwards compatibility with lazy evaluation
import { getDatabase } from './connection';

// Create a proxy object that lazily gets the database
export const db = new Proxy({} as ReturnType<typeof getDatabase>, {
  get(_target, prop) {
    return (getDatabase() as Record<string | symbol, unknown>)[prop];
  },
});
