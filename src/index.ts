/**
 * BaseBase JavaScript SDK
 * Firebase-compatible API for BaseBase server interactions
 *
 * @example
 * ```typescript
 * import { initializeApp, getBasebase, collection, doc, getDocs, getDoc } from 'basebase-js';
 *
 * // Initialize the app
 * const app = initializeApp({
 *   projectId: 'my-project',
 *   apiKey: 'bb_your_api_key_here'
 * });
 *
 * const basebase = getBasebase(app);
 *
 * // Get a collection
 * const usersRef = collection(basebase, 'users');
 * const snapshot = await getDocs(usersRef);
 *
 * // Get a document
 * const userRef = doc(basebase, 'users/user123');
 * const userSnap = await getDoc(userRef);
 * ```
 */

// ========================================
// Core Exports
// ========================================

// App initialization
export {
  initializeApp,
  getApp,
  getApps,
  deleteApp,
  getBasebase,
  initializeBasebase,
  getDefaultBasebase,
  hasApp,
  getAppConfig,
  validateConfig,
  clearAllApps,
  healthCheck,
  isDevelopment,
  getEnvironmentBaseUrl,
} from "./app";

// Authentication
export {
  requestCode,
  verifyCode,
  signOut,
  getAuthState,
  isAuthenticated,
  onAuthStateChanged,
  getToken,
  getUser,
  getProject,
  setToken,
  setUser,
  setProject,
  removeToken,
  getAuthHeader,
  validateStoredToken,
  decodeTokenPayload,
  isTokenExpired,
  setDirectToken,
  getDirectToken,
  removeDirectToken,
} from "./auth";

// Auto-initializing singleton basebase instance
export {
  basebase,
  getSingletonBasebase,
  configureSingletonBasebase,
  resetSingletonBasebase,
  isSingletonConfigured,
} from "./singleton";

// Ready-to-use functions (no initialization required)
export {
  // Document operations
  doc,
  collection,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,

  // Query operations
  query,
  where,
  orderBy,
  limit,

  // Direct-by-path convenience functions
  getDocByPath,
  getDocsFromCollection,
  setDocByPath,
  updateDocByPath,
  deleteDocByPath,
  addDocToCollection,
} from "./convenience";

// Query validation utilities
export {
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
import { setBasebaseHost } from "./types";

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

  // Operation result types
  WriteResult,
  SetOptions,

  // Error types
  BasebaseError,
  BasebaseErrorInfo,
  BasebaseErrorCode,

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

export { DEFAULT_BASE_URL, BASEBASE_ERROR_CODES, setBasebaseHost } from "./types";

// ========================================
// Default Export for Convenient Imports
// ========================================

import { initializeApp, getBasebase, getApp, getApps, deleteApp } from "./app";
import {
  requestCode,
  verifyCode,
  signOut,
  getAuthState,
  isAuthenticated,
  getUser,
  getProject,
  onAuthStateChanged,
  setDirectToken,
  getDirectToken,
  removeDirectToken,
} from "./auth";

import {
  basebase as singletonBasebase,
  configureSingletonBasebase,
} from "./singleton";
import {
  doc,
  collection,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  getDocByPath,
  getDocsFromCollection,
  setDocByPath,
  updateDocByPath,
  deleteDocByPath,
  addDocToCollection,
} from "./convenience";

/**
 * Default export with the most commonly used functions
 * This allows for convenient importing like:
 * import basebase from 'basebase-js';
 * const userRef = basebase.doc('users/user123');
 *
 * Or for manual initialization (advanced use cases):
 * import basebase from 'basebase-js';
 * const app = basebase.initializeApp(config);
 */
const basebase = {
  // Singleton instance access
  getInstance: () => singletonBasebase,
  configureSingletonBasebase,

  // Document operations (auto-use singleton)
  doc,
  collection,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,

  // Query operations (auto-use singleton)
  query,
  where,
  orderBy,
  limit,

  // Direct-by-path convenience functions
  getDocByPath,
  getDocsFromCollection,
  setDocByPath,
  updateDocByPath,
  deleteDocByPath,
  addDocToCollection,

  // Authentication
  requestCode,
  verifyCode,
  signOut,
  getAuthState,
  isAuthenticated,
  getUser,
  getProject,
  onAuthStateChanged,
  setDirectToken,
  getDirectToken,
  removeDirectToken,

  // Configuration
  setBasebaseHost,

  // Advanced: Manual app management (for multi-tenant apps)
  initializeApp,
  getBasebase,
  getApp,
  getApps,
  deleteApp,
};

export default basebase;

// ========================================
// Version Information
// ========================================

export const VERSION = "0.1.0";

// ========================================
// Browser Global Registration
// ========================================

// Register BaseBase on window object for script tag usage
if (typeof window !== "undefined") {
  (window as any).BasebaseSDK = basebase;
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
