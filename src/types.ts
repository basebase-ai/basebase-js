/**
 * BaseBase SDK Type Definitions
 * Provides Firebase-compatible types for BaseBase server interactions
 */

// ========================================
// Core BaseBase Data Types (Firestore-compatible)
// ========================================

export interface BasebaseValue {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  nullValue?: null;
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
  createTime?: string;
  updateTime?: string;
}

export interface BasebaseDocumentData {
  [field: string]: any;
}

// ========================================
// Authentication Types
// ========================================

export interface BasebaseConfig {
  projectId?: string;
  apiKey: string;
  baseUrl?: string;
  token?: string; // JWT token for server environments
}

export interface RequestCodeRequest {
  name: string;
  phone: string;
}

export interface RequestCodeResponse {
  success: boolean;
  message: string;
}

export interface VerifyCodeRequest {
  phone: string;
  code: string;
  projectApiKey: string;
}

export interface BasebaseUser {
  id: string;
  name: string;
  phone: string;
}

export interface BasebaseProject {
  id: string;
  name: string;
}

export interface VerifyCodeResponse {
  token: string;
  user: BasebaseUser;
  project: BasebaseProject;
}

export interface AuthState {
  user: BasebaseUser | null;
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
  apiKey: string;
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
  | "array-contains-any";

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
  documents: BasebaseDocument[];
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

export const DEFAULT_BASE_URL = "https://app.basebase.us";

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
