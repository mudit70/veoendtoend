import type Database from 'better-sqlite3';

export { getDatabase, getDatabase as getDb, initializeDatabaseConnection, closeDatabase, setDatabase } from './connection';
export { createTables } from './schema';
export { initializeDatabase } from './init';

// Re-export getDatabase as db for backwards compatibility with lazy evaluation
import { getDatabase } from './connection';

// Create a proxy object that lazily gets the database
export const db: Database.Database = new Proxy({} as Database.Database, {
  get(_target, prop: string | symbol) {
    const database = getDatabase();
    const value = database[prop as keyof Database.Database];
    if (typeof value === 'function') {
      return value.bind(database);
    }
    return value;
  },
});
