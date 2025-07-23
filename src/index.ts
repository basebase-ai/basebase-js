/**
 * BaseBase JavaScript SDK
 * Firebase-compatible API for BaseBase server interactions
 *
 * @example
 * ```typescript
 * import { verifyCode, db, collection, doc, getDocs, getDoc, callFunction } from 'basebase-js';
 *
 * // Browser: First authenticate
 * await verifyCode('+1234567890', '123456', 'bb_your_api_key');
 *
 * // Then use db directly
 * const usersRef = collection(db, 'myproject/users');
 * const snapshot = await getDocs(usersRef);
 *
 * // Call server-side functions
 * const result = await callFunction('getPage', {
 *   url: 'https://example.com',
 *   selector: 'h1'
 * });
 *
 * // Server: Use getDatabase with token
 * import { getDatabase } from 'basebase-js';
 * const db = getDatabase('your_jwt_token_here');
 * const userRef = doc(db, 'myproject/users/user123');
 * const userSnap = await getDoc(userRef);
 *
 * // Call functions with custom instance
 * const functionResult = await callFunction('processData', { data: 'test' }, db);
 * ```
 */

// ========================================
// Core Exports
// ========================================

// Database initialization
export { getDatabase, db } from "./app";

// Authentication
export {
  requestCode,
  verifyCode,
  signOut,
  getAuthState,
  onAuthStateChanged,
} from "./auth";

// Task operations
export {
  doTask,
  setTask,
  getTask,
  listTasks,
  updateTask,
  deleteTask,
  addTrigger,
  setTrigger,
  getTrigger,
  listTriggers,
  updateTrigger,
  deleteTrigger,
} from "./functions";

// Document operations
export {
  doc,
  collection,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from "./document";

// Query operations
export {
  query,
  where,
  orderBy,
  limit,
  validateQueryConstraint,
  hasConstraintType,
  getConstraintsOfType,
} from "./query";

// Utility functions
export {
  toBasebaseValue,
  fromBasebaseValue,
  toBasebaseDocument,
  fromBasebaseDocument,
  makeHttpRequest,
  validatePath,
  validateDocumentId,
  validateProjectId,
  isValidProjectId,
  buildPath,
  generateId,
  deepClone,
  isBrowser,
  getNestedProperty,
} from "./utils";

// ========================================
// Type Exports
// ========================================

export type {
  // Configuration types
  BasebaseConfig,
  BasebaseApp,
  Basebase,

  // Authentication types
  RequestCodeRequest,
  RequestCodeResponse,
  VerifyCodeRequest,
  VerifyCodeResponse,
  BasebaseUser,
  BasebaseProject,
  AuthState,

  // Data types
  BasebaseValue,
  BasebaseDocument,
  BasebaseDocumentData,
  UpdateData,

  // Reference and snapshot types
  DocumentReference,
  CollectionReference,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  QuerySnapshot,

  // Query types
  Query,
  QueryConstraint,
  WhereConstraint,
  OrderByConstraint,
  LimitConstraint,
  WhereFilterOp,
  OrderByDirection,
  StructuredQuery,
  StructuredQueryFilter,
  StructuredQueryFieldFilter,
  StructuredQueryOrder,
  RunQueryRequest,
  RunQueryResponse,

  // Operation result types
  WriteResult,
  SetOptions,

  // Error types
  BasebaseError,
  BasebaseErrorInfo,
  BasebaseErrorCode,

  // Task types
  TaskExecutionRequest,
  TaskExecutionResponse,
  CloudTask,
  SetTaskRequest,
  UpdateTaskRequest,
  TriggeredTask,
  CreateTriggerRequest,
  UpdateTriggerRequest,
  TriggerListResponse,
  TaskListResponse,

  // API response types
  BasebaseApiResponse,
  BasebaseListResponse,

  // Utility types
  Primitive,
  NestedUpdateFields,
  PartialWithFieldValue,
} from "./types";

// ========================================
// Constants
// ========================================

export { DEFAULT_BASE_URL, BASEBASE_ERROR_CODES } from "./types";

// ========================================
// Default Export for Convenient Imports
// ========================================

import { getDatabase, db } from "./app";

import {
  requestCode,
  verifyCode,
  signOut,
  getAuthState,
  onAuthStateChanged,
} from "./auth";

import {
  doc,
  collection,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from "./document";

import { query, where, orderBy, limit } from "./query";

import {
  doTask,
  setTask,
  getTask,
  listTasks,
  updateTask,
  deleteTask,
  addTrigger,
  setTrigger,
  getTrigger,
  listTriggers,
  updateTrigger,
  deleteTrigger,
} from "./functions";

export default {
  // Core functionality
  getDatabase,
  db,

  // Authentication
  requestCode,
  verifyCode,
  signOut,
  getAuthState,
  onAuthStateChanged,

  // Document operations
  doc,
  collection,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,

  // Query operations
  query,
  where,
  orderBy,
  limit,
  getDocs,

  // Task operations
  doTask,
  setTask,
  getTask,
  listTasks,
  updateTask,
  deleteTask,
  addTrigger,
  setTrigger,
  getTrigger,
  listTriggers,
  updateTrigger,
  deleteTrigger,
};

// ========================================
// Version Information
// ========================================

export const VERSION = "0.1.5";

// ========================================
// Browser Global Registration
// ========================================

// Register BaseBase on window object for script tag usage
if (typeof window !== "undefined") {
  (window as any).BasebaseSDK = {
    // Core functionality
    getDatabase,
    db,

    // Authentication
    requestCode,
    verifyCode,
    signOut,
    getAuthState,
    onAuthStateChanged,

    // Document operations
    doc,
    collection,
    getDoc,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,

    // Query operations
    query,
    where,
    orderBy,
    limit,
    getDocs,

    // Task operations
    doTask,
    setTask,
    getTask,
    listTasks,
    updateTask,
    deleteTask,
    addTrigger,
    setTrigger,
    getTrigger,
    listTriggers,
    updateTrigger,
    deleteTrigger,
  };
}

// ========================================
// Module Information
// ========================================

/**
 * BaseBase JavaScript SDK Module Information
 */
export const MODULE_INFO = {
  name: "basebase-js",
  version: VERSION,
  description: "Firebase-compatible SDK for BaseBase server",
  author: "BaseBase Team",
  homepage: "https://github.com/grenager/basebase-js-sdk",
  repository: "https://github.com/grenager/basebase-js-sdk.git",
  license: "MIT",
} as const;
