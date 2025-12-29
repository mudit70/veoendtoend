import type Database from 'better-sqlite3';

export function createTables(db: Database.Database): void {
  // Projects table
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Documents table
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      filepath TEXT,
      mime_type TEXT NOT NULL,
      content TEXT NOT NULL,
      hash TEXT NOT NULL,
      size INTEGER NOT NULL,
      source_type TEXT NOT NULL DEFAULT 'UPLOAD' CHECK (source_type IN ('UPLOAD', 'FOLDER', 'REPOSITORY')),
      source_path TEXT,
      source_name TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // Document versions table (for tracking changes)
  db.exec(`
    CREATE TABLE IF NOT EXISTS document_versions (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      content TEXT NOT NULL,
      hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    )
  `);

  // Operations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS operations (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL CHECK (type IN ('USER_INTERACTION', 'CLIENT_OPERATION', 'API_CALL', 'DATA_FLOW')),
      status TEXT NOT NULL CHECK (status IN ('DISCOVERED', 'CONFIRMED', 'REJECTED', 'MANUAL')),
      confidence REAL NOT NULL DEFAULT 0,
      source_document_ids TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // Diagrams table
  db.exec(`
    CREATE TABLE IF NOT EXISTS diagrams (
      id TEXT PRIMARY KEY,
      operation_id TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED')),
      viewport_state TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE
    )
  `);

  // Diagram components table
  db.exec(`
    CREATE TABLE IF NOT EXISTS diagram_components (
      id TEXT PRIMARY KEY,
      diagram_id TEXT NOT NULL,
      component_type TEXT NOT NULL CHECK (component_type IN (
        'USER_ACTION', 'CLIENT_CODE', 'FIREWALL', 'WAF', 'LOAD_BALANCER',
        'API_GATEWAY', 'API_ENDPOINT', 'BACKEND_LOGIC', 'DATABASE',
        'EVENT_HANDLER', 'VIEW_UPDATE'
      )),
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL CHECK (status IN ('POPULATED', 'GREYED_OUT', 'USER_MODIFIED')),
      confidence REAL NOT NULL DEFAULT 0,
      source_excerpt TEXT,
      source_document_id TEXT,
      position_x REAL NOT NULL DEFAULT 0,
      position_y REAL NOT NULL DEFAULT 0,
      original_title TEXT,
      original_description TEXT,
      is_user_modified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (diagram_id) REFERENCES diagrams(id) ON DELETE CASCADE,
      FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL
    )
  `);

  // Diagram edges table
  db.exec(`
    CREATE TABLE IF NOT EXISTS diagram_edges (
      id TEXT PRIMARY KEY,
      diagram_id TEXT NOT NULL,
      source_component_id TEXT NOT NULL,
      target_component_id TEXT NOT NULL,
      edge_type TEXT NOT NULL CHECK (edge_type IN ('REQUEST', 'RESPONSE')),
      label TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (diagram_id) REFERENCES diagrams(id) ON DELETE CASCADE,
      FOREIGN KEY (source_component_id) REFERENCES diagram_components(id) ON DELETE CASCADE,
      FOREIGN KEY (target_component_id) REFERENCES diagram_components(id) ON DELETE CASCADE
    )
  `);

  // Validation runs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS validation_runs (
      id TEXT PRIMARY KEY,
      diagram_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),
      score REAL,
      total_components INTEGER NOT NULL DEFAULT 0,
      validated_components INTEGER NOT NULL DEFAULT 0,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (diagram_id) REFERENCES diagrams(id) ON DELETE CASCADE
    )
  `);

  // Validation results table
  db.exec(`
    CREATE TABLE IF NOT EXISTS validation_results (
      id TEXT PRIMARY KEY,
      validation_run_id TEXT NOT NULL,
      component_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('VALID', 'WARNING', 'INVALID', 'UNVERIFIABLE', 'STALE')),
      discrepancies TEXT,
      confidence REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (validation_run_id) REFERENCES validation_runs(id) ON DELETE CASCADE,
      FOREIGN KEY (component_id) REFERENCES diagram_components(id) ON DELETE CASCADE
    )
  `);

  // Discovery jobs table (for async operations)
  db.exec(`
    CREATE TABLE IF NOT EXISTS discovery_jobs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),
      progress REAL NOT NULL DEFAULT 0,
      result TEXT,
      error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
    CREATE INDEX IF NOT EXISTS idx_operations_project_id ON operations(project_id);
    CREATE INDEX IF NOT EXISTS idx_diagrams_operation_id ON diagrams(operation_id);
    CREATE INDEX IF NOT EXISTS idx_diagram_components_diagram_id ON diagram_components(diagram_id);
    CREATE INDEX IF NOT EXISTS idx_diagram_edges_diagram_id ON diagram_edges(diagram_id);
    CREATE INDEX IF NOT EXISTS idx_validation_runs_diagram_id ON validation_runs(diagram_id);
    CREATE INDEX IF NOT EXISTS idx_validation_results_validation_run_id ON validation_results(validation_run_id);
    CREATE INDEX IF NOT EXISTS idx_discovery_jobs_project_id ON discovery_jobs(project_id);
  `);
}
