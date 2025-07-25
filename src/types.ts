/**
 * BaseBase SDK Type Definitions
 * Provides Firebase-compatible types for BaseBase server interactions
 */

// ========================================
// Task Execution Types
// ========================================

export interface TaskExecutionRequest {
  [parameterName: string]: any;
}

export interface TaskExecutionResponse {
  result: any;
  error?: string;
  details?: string;
  taskName?: string;
  suggestion?: string;
}

export interface BasebaseTask {
  name: string;
  description?: string;
  parameters?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListTasksResponse {
  tasks: BasebaseTask[];
}

// ========================================
// Core BaseBase Data Types (Firestore-compatible)
// ========================================

export interface BasebaseValue {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  nullValue?: null;
  timestampValue?: string;
  arrayValue?: {
    values: BasebaseValue[];
  };
  mapValue?: {
    fields: Record<string, BasebaseValue>;
  };
}

export interface BasebaseDocument {
  name?: string;
  fields: Record<string, BasebaseValue>;
  createdAt?: string;
  updatedAt?: string;
}

export interface BasebaseDocumentData {
  [field: string]: any;
}

// ========================================
// Authentication Types
// ========================================

export interface BasebaseConfig {
  projectId?: string;
  baseUrl?: string;
  token?: string; // JWT token for server environments
}

export interface RequestCodeRequest {
  username: string;
  phone: string;
}

export interface RequestCodeResponse {
  success: boolean;
  message: string;
}

export interface VerifyCodeRequest {
  phone: string;
  code: string;
  projectId: string;
}

export interface BasebaseUser {
  id: string;
  name: string;
  phone: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BasebaseProject {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  ownerId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Raw response format from server (Firebase-like)
export interface RawVerifyCodeResponse {
  token: string;
  user: {
    name: string;
    fields: Record<string, BasebaseValue>;
  };
  project: {
    name: string;
    fields: Record<string, BasebaseValue>;
  };
}

// Parsed response format for application use
export interface VerifyCodeResponse {
  token: string;
  user: BasebaseUser;
  project: BasebaseProject;
}

export interface AuthState {
  user: BasebaseUser | null;
  project: BasebaseProject | null;
  token: string | null;
  isAuthenticated: boolean;
}

// ========================================
// App and Basebase Instance Types
// ========================================

export interface BasebaseApp {
  name: string;
  options: BasebaseConfig;
}

export interface Basebase {
  app: BasebaseApp;
  projectId: string;
  baseUrl: string;
}

// ========================================
// Document and Collection Reference Types
// ========================================

export interface DocumentReference {
  id: string;
  path: string;
  basebase: Basebase;
  parent: CollectionReference;
  get(): Promise<DocumentSnapshot>;
  set(data: BasebaseDocumentData, options?: SetOptions): Promise<WriteResult>;
  update(data: UpdateData): Promise<WriteResult>;
  delete(): Promise<WriteResult>;
}

export interface CollectionReference {
  id: string;
  path: string;
  basebase: Basebase;
  parent?: DocumentReference;
  get(): Promise<QuerySnapshot>;
  add(data: BasebaseDocumentData): Promise<DocumentReference>;
}

export interface DocumentSnapshot {
  id: string;
  ref: DocumentReference;
  exists: boolean;
  data(): BasebaseDocumentData | undefined;
  get(fieldPath: string): any;
}

export interface QueryDocumentSnapshot extends DocumentSnapshot {
  data(): BasebaseDocumentData;
}

export interface QuerySnapshot {
  empty: boolean;
  size: number;
  docs: QueryDocumentSnapshot[];
  forEach(callback: (doc: QueryDocumentSnapshot) => void): void;
}

// ========================================
// Query Types
// ========================================

export type WhereFilterOp =
  | "=="
  | "!="
  | "<"
  | "<="
  | ">"
  | ">="
  | "array-contains"
  | "in"
  | "not-in"
  | "array-contains-any"
  | "matches";

export type OrderByDirection = "asc" | "desc";

export interface QueryConstraint {
  type: "where" | "orderBy" | "limit" | "startAt" | "endAt";
}

export interface WhereConstraint extends QueryConstraint {
  type: "where";
  fieldPath: string;
  opStr: WhereFilterOp;
  value: any;
}

export interface OrderByConstraint extends QueryConstraint {
  type: "orderBy";
  fieldPath: string;
  directionStr: OrderByDirection;
}

export interface LimitConstraint extends QueryConstraint {
  type: "limit";
  limit: number;
}

export interface Query {
  basebase: Basebase;
  path: string;
  constraints: QueryConstraint[];
  get(): Promise<QuerySnapshot>;
}

// ========================================
// Structured Query Types (for runQuery endpoint)
// ========================================

export interface StructuredQueryFieldFilter {
  field: {
    fieldPath: string;
  };
  op: string;
  value: BasebaseValue;
}

export interface StructuredQueryFilter {
  fieldFilter?: StructuredQueryFieldFilter;
  compositeFilter?: {
    op: "AND" | "OR";
    filters: StructuredQueryFilter[];
  };
}

export interface StructuredQueryOrder {
  field: {
    fieldPath: string;
  };
  direction: "ASCENDING" | "DESCENDING";
}

export interface StructuredQuery {
  select?: {
    fields: Array<{ fieldPath: string }>;
  };
  from: Array<{
    collectionId: string;
    allDescendants?: boolean;
  }>;
  where?: StructuredQueryFilter;
  orderBy?: StructuredQueryOrder[];
  limit?: number;
  offset?: number;
  startAt?: {
    values: BasebaseValue[];
    before?: boolean;
  };
  endAt?: {
    values: BasebaseValue[];
    before?: boolean;
  };
}

export interface RunQueryRequest {
  structuredQuery: StructuredQuery;
  parent?: string;
}

export interface RunQueryResponse {
  document?: BasebaseDocument;
  readTime?: string;
  skippedResults?: number;
}

// ========================================
// API Response Types
// ========================================

export interface BasebaseApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface BasebaseListResponse {
  documents: BasebaseDocumentData[];
  nextPageToken?: string;
}

// ========================================
// Write Operation Types
// ========================================

export interface WriteResult {
  writeTime: string;
}

export interface SetOptions {
  merge?: boolean;
  mergeFields?: string[];
}

// ========================================
// Task Types
// ========================================

// Task Reference Types (following document pattern)
export interface TaskReference {
  id: string;
  path: string;
  basebase: Basebase;
  get(): Promise<CloudTask>;
  set(data: SetTaskData): Promise<CloudTask>;
  update(data: UpdateTaskData): Promise<CloudTask>;
  delete(): Promise<void>;
}

export interface TriggersReference {
  id: string;
  path: string;
  basebase: Basebase;
  add(data: CreateTriggerData): Promise<TriggeredTask>;
  trigger(triggerId: string): TriggerReference;
}

export interface TriggerReference {
  id: string;
  path: string;
  basebase: Basebase;
  get(): Promise<TriggeredTask>;
  set(data: CreateTriggerData): Promise<TriggeredTask>;
  update(data: UpdateTriggerData): Promise<TriggeredTask>;
  delete(): Promise<void>;
}

// Task Data Types (user-friendly field names)
export interface SetTaskData {
  code: string;
  description?: string;
  timeout?: number;
  memoryMB?: number;
  runtime?: string;
  environmentVariables?: Record<string, string>;
}

export interface UpdateTaskData {
  code?: string;
  description?: string;
  timeout?: number;
  memoryMB?: number;
  runtime?: string;
  environmentVariables?: Record<string, string>;
}

export interface CreateTriggerData {
  taskName: string;
  schedule: string;
  name?: string;
  timeZone?: string;
  data?: Record<string, any>;
  enabled?: boolean;
}

export interface UpdateTriggerData {
  taskName?: string;
  schedule?: string;
  name?: string;
  timeZone?: string;
  data?: Record<string, any>;
  enabled?: boolean;
}

// Task Management Types
export interface CloudTask {
  id: string;
  description: string;
  implementationCode?: string;
  createdAt?: string;
  updatedAt?: string;
  timeout?: number;
  memoryMB?: number;
  runtime?: string;
  environmentVariables?: Record<string, string>;
}

export interface SetTaskRequest {
  id: string;
  implementationCode: string;
  description?: string;
  timeout?: number;
  memoryMB?: number;
  runtime?: string;
  environmentVariables?: Record<string, string>;
}

export interface UpdateTaskRequest {
  implementationCode?: string;
  description?: string;
  timeout?: number;
  memoryMB?: number;
  runtime?: string;
  environmentVariables?: Record<string, string>;
}

export interface TaskListResponse {
  tasks: CloudTask[];
  nextPageToken?: string;
}

// Function Scheduling Types
export interface TriggeredTask {
  name: string;
  taskName: string;
  schedule: string; // Cron expression
  timeZone?: string;
  data?: Record<string, any>;
  description?: string;
  enabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastRun?: string;
  nextRun?: string;
}

export interface CreateTriggerRequest {
  name: string;
  taskName: string;
  schedule: string; // Cron expression
  timeZone?: string;
  data?: any;
  enabled?: boolean;
}

export interface UpdateTriggerRequest {
  schedule?: string;
  timeZone?: string;
  data?: Record<string, any>;
  description?: string;
  enabled?: boolean;
}

export interface TriggerListResponse {
  triggers: TriggeredTask[];
  nextPageToken?: string;
}

// ========================================
// Error Types
// ========================================

export class BasebaseError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "BasebaseError";
  }
}

export interface BasebaseErrorInfo {
  code: string;
  message: string;
  details?: any;
}

// ========================================
// Utility Types
// ========================================

export type Primitive = string | number | boolean | null | undefined;

export type NestedUpdateFields<T> = T extends Primitive
  ? T
  : T extends any[]
  ? T
  : T extends object
  ? {
      [K in keyof T]?: NestedUpdateFields<T[K]>;
    } & {
      [key: string]: any;
    }
  : never;

export type UpdateData<T = BasebaseDocumentData> = NestedUpdateFields<T>;

export type PartialWithFieldValue<T> =
  | Partial<T>
  | (T extends Primitive ? T : never);

// ========================================
// Constants
// ========================================

// Global base URL that can be updated
let GLOBAL_BASE_URL = "https://api.basebase.us";

// API version for path prefixing
export const API_VERSION = "v1";

export const DEFAULT_BASE_URL = GLOBAL_BASE_URL;

export function setBasebaseHost(url: string) {
  GLOBAL_BASE_URL = url;
}

export function getGlobalBaseUrl(): string {
  return GLOBAL_BASE_URL;
}

export const BASEBASE_ERROR_CODES = {
  PERMISSION_DENIED: "permission-denied",
  NOT_FOUND: "not-found",
  ALREADY_EXISTS: "already-exists",
  INVALID_ARGUMENT: "invalid-argument",
  UNAUTHENTICATED: "unauthenticated",
  UNAVAILABLE: "unavailable",
  INTERNAL: "internal",
  NETWORK_ERROR: "network-error",
} as const;

export type BasebaseErrorCode =
  (typeof BASEBASE_ERROR_CODES)[keyof typeof BASEBASE_ERROR_CODES];
