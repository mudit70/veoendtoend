// Shared types for VeoEndToEnd

// Project types
export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// Document types
export type DocumentSourceType = 'UPLOAD' | 'FOLDER' | 'REPOSITORY';

export interface Document {
  id: string;
  projectId: string;
  filename: string;
  filepath?: string; // relative path within source folder/repo
  mimeType: string;
  content: string;
  hash: string;
  size: number;
  sourceType: DocumentSourceType;
  sourcePath?: string; // folder path or repo URL
  sourceName?: string; // friendly name for the source
  createdAt: string;
  updatedAt: string;
}

// Import request types
export interface FolderImportRequest {
  folders: {
    path: string;
    name?: string; // optional friendly name
    recursive?: boolean;
  }[];
  fileTypes?: string[]; // e.g., ['.txt', '.md', '.json', '.pdf']
}

export interface RepoImportRequest {
  repositories: {
    url: string;
    name?: string; // optional friendly name
    branch?: string;
    authToken?: string;
  }[];
  fileTypes?: string[]; // e.g., ['.txt', '.md', '.json', '.pdf']
}

export interface ImportResult {
  totalFiles: number;
  importedFiles: number;
  skippedFiles: number;
  errors: { file: string; error: string }[];
  documents: Document[];
}

// Operation types
export type OperationType = 'USER_INTERACTION' | 'CLIENT_OPERATION' | 'API_CALL' | 'DATA_FLOW';
export type OperationStatus = 'DISCOVERED' | 'CONFIRMED' | 'REJECTED' | 'MANUAL';

export interface Operation {
  id: string;
  projectId: string;
  name: string;
  description: string;
  type: OperationType;
  status: OperationStatus;
  confidence: number;
  sourceDocumentIds: string[];
  createdAt: string;
  updatedAt: string;
}

// Diagram types
export type ComponentType =
  | 'USER_ACTION'
  | 'CLIENT_CODE'
  | 'FIREWALL'
  | 'WAF'
  | 'LOAD_BALANCER'
  | 'API_GATEWAY'
  | 'API_ENDPOINT'
  | 'BACKEND_LOGIC'
  | 'DATABASE'
  | 'EVENT_HANDLER'
  | 'VIEW_UPDATE';

export type ComponentStatus = 'POPULATED' | 'GREYED_OUT' | 'USER_MODIFIED';

export interface DiagramComponent {
  id: string;
  diagramId: string;
  componentType: ComponentType;
  title: string;
  description: string;
  status: ComponentStatus;
  confidence: number;
  sourceExcerpt?: string;
  sourceDocumentId?: string;
  position: { x: number; y: number };
  originalTitle?: string;
  originalDescription?: string;
  isUserModified: boolean;
  createdAt: string;
  updatedAt: string;
}

export type EdgeType = 'REQUEST' | 'RESPONSE';

export interface DiagramEdge {
  id: string;
  diagramId: string;
  sourceComponentId: string;
  targetComponentId: string;
  edgeType: EdgeType;
  label?: string;
  createdAt: string;
}

export interface Diagram {
  id: string;
  operationId: string;
  name: string;
  status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  viewportState?: {
    x: number;
    y: number;
    zoom: number;
  };
  createdAt: string;
  updatedAt: string;
}

// Validation types
export type ValidationStatus = 'VALID' | 'WARNING' | 'INVALID' | 'UNVERIFIABLE' | 'STALE';
export type DiscrepancyType = 'CONTENT_MISMATCH' | 'MISSING_DATA' | 'CONFLICTING_SOURCES';
export type SeverityLevel = 'CRITICAL' | 'MAJOR' | 'MINOR';

export interface Discrepancy {
  type: DiscrepancyType;
  severity: SeverityLevel;
  field: string;
  diagramValue: string;
  corpusValue: string;
  suggestedFix?: string;
  sourceDocumentId?: string;
}

export interface ValidationResult {
  id: string;
  validationRunId: string;
  componentId: string;
  status: ValidationStatus;
  discrepancies: Discrepancy[];
  confidence: number;
  createdAt: string;
}

export interface ValidationRun {
  id: string;
  diagramId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  score?: number;
  totalComponents: number;
  validatedComponents: number;
  startedAt: string;
  completedAt?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Job types
export interface Job {
  id: string;
  type: 'DISCOVERY' | 'DIAGRAM_GENERATION' | 'VALIDATION';
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  progress: number;
  result?: unknown;
  error?: string;
  createdAt: string;
  updatedAt: string;
}
