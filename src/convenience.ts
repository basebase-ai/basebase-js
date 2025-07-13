/**
 * BaseBase Convenience Functions
 * Provides easy-to-use functions that work with the singleton basebase instance
 */

import { basebase } from "./singleton";
import {
  DocumentReference,
  CollectionReference,
  DocumentSnapshot,
  QuerySnapshot,
  QueryConstraint,
  WriteResult,
  SetOptions,
  UpdateData,
  BasebaseDocumentData,
  Query,
} from "./types";
import {
  doc as _doc,
  collection as _collection,
  getDoc as _getDoc,
  getDocs as _getDocs,
  addDoc as _addDoc,
  setDoc as _setDoc,
  updateDoc as _updateDoc,
  deleteDoc as _deleteDoc,
} from "./document";
import {
  query as _query,
  where as _where,
  orderBy as _orderBy,
  limit as _limit,
} from "./query";

// ========================================
// Document and Collection Reference Functions
// ========================================

/**
 * Get a document reference using the singleton basebase instance
 *
 * @example
 * ```typescript
 * import { doc } from 'basebase-js';
 *
 * const userRef = doc('users/user123');
 * const userSnap = await getDoc(userRef);
 * ```
 */
export function doc(path: string, projectName?: string): DocumentReference {
  return _doc(basebase, path, projectName);
}

/**
 * Get a collection reference using the singleton basebase instance
 *
 * @example
 * ```typescript
 * import { collection } from 'basebase-js';
 *
 * const usersRef = collection('users');
 * const snapshot = await getDocs(usersRef);
 * ```
 */
export function collection(
  path: string,
  projectName?: string
): CollectionReference {
  return _collection(basebase, path, projectName);
}

// ========================================
// Document Operation Functions
// ========================================

/**
 * Get a document snapshot using the singleton basebase instance
 *
 * @example
 * ```typescript
 * import { doc, getDoc } from 'basebase-js';
 *
 * const userRef = doc('users/user123');
 * const userSnap = await getDoc(userRef);
 * if (userSnap.exists) {
 *   console.log(userSnap.data());
 * }
 * ```
 */
export function getDoc(docRef: DocumentReference): Promise<DocumentSnapshot> {
  return _getDoc(docRef);
}

/**
 * Get all documents in a collection using the singleton basebase instance
 *
 * @example
 * ```typescript
 * import { collection, getDocs } from 'basebase-js';
 *
 * const usersRef = collection('users');
 * const snapshot = await getDocs(usersRef);
 * snapshot.forEach(doc => console.log(doc.data()));
 * ```
 */
export function getDocs(
  collectionRef: CollectionReference | Query
): Promise<QuerySnapshot> {
  // Both CollectionReference and Query have a get() method
  return collectionRef.get();
}

/**
 * Add a new document with auto-generated ID using the singleton basebase instance
 *
 * @example
 * ```typescript
 * import { collection, addDoc } from 'basebase-js';
 *
 * const usersRef = collection('users');
 * const docRef = await addDoc(usersRef, {
 *   name: 'John Doe',
 *   email: 'john@example.com'
 * });
 * console.log('New document ID:', docRef.id);
 * ```
 */
export function addDoc(
  collectionRef: CollectionReference,
  data: BasebaseDocumentData
): Promise<DocumentReference> {
  return _addDoc(collectionRef, data);
}

/**
 * Set a document with a specific ID using the singleton basebase instance
 *
 * @example
 * ```typescript
 * import { doc, setDoc } from 'basebase-js';
 *
 * const userRef = doc('users/user123');
 * await setDoc(userRef, {
 *   name: 'John Doe',
 *   email: 'john@example.com'
 * });
 * ```
 */
export function setDoc(
  docRef: DocumentReference,
  data: BasebaseDocumentData,
  options?: SetOptions
): Promise<WriteResult> {
  return _setDoc(docRef, data, options);
}

/**
 * Update specific fields in a document using the singleton basebase instance
 *
 * @example
 * ```typescript
 * import { doc, updateDoc } from 'basebase-js';
 *
 * const userRef = doc('users/user123');
 * await updateDoc(userRef, {
 *   age: 31,
 *   'profile.lastLogin': new Date().toISOString()
 * });
 * ```
 */
export function updateDoc(
  docRef: DocumentReference,
  data: UpdateData
): Promise<WriteResult> {
  return _updateDoc(docRef, data);
}

/**
 * Delete a document using the singleton basebase instance
 *
 * @example
 * ```typescript
 * import { doc, deleteDoc } from 'basebase-js';
 *
 * const userRef = doc('users/user123');
 * await deleteDoc(userRef);
 * ```
 */
export function deleteDoc(docRef: DocumentReference): Promise<WriteResult> {
  return _deleteDoc(docRef);
}

// ========================================
// Query Functions
// ========================================

/**
 * Create a query using the singleton basebase instance
 *
 * @example
 * ```typescript
 * import { collection, query, where, orderBy, limit, getDocs } from 'basebase-js';
 *
 * const usersRef = collection('users');
 * const q = query(usersRef, where('age', '>=', 18), orderBy('name'), limit(10));
 * const snapshot = await getDocs(q);
 * ```
 */
export function query(
  collectionRef: CollectionReference,
  ...queryConstraints: QueryConstraint[]
): Query {
  return _query(collectionRef, ...queryConstraints);
}

/**
 * Create a where constraint for queries
 *
 * @example
 * ```typescript
 * import { collection, query, where, getDocs } from 'basebase-js';
 *
 * const usersRef = collection('users');
 * const q = query(usersRef, where('age', '>=', 18));
 * const snapshot = await getDocs(q);
 * ```
 */
export function where(
  fieldPath: string,
  opStr: any,
  value: any
): QueryConstraint {
  return _where(fieldPath, opStr, value);
}

/**
 * Create an orderBy constraint for queries
 *
 * @example
 * ```typescript
 * import { collection, query, orderBy, getDocs } from 'basebase-js';
 *
 * const usersRef = collection('users');
 * const q = query(usersRef, orderBy('name', 'asc'));
 * const snapshot = await getDocs(q);
 * ```
 */
export function orderBy(
  fieldPath: string,
  directionStr: any = "asc"
): QueryConstraint {
  return _orderBy(fieldPath, directionStr);
}

/**
 * Create a limit constraint for queries
 *
 * @example
 * ```typescript
 * import { collection, query, limit, getDocs } from 'basebase-js';
 *
 * const usersRef = collection('users');
 * const q = query(usersRef, limit(10));
 * const snapshot = await getDocs(q);
 * ```
 */
export function limit(limitValue: number): QueryConstraint {
  return _limit(limitValue);
}

// ========================================
// Convenience Shortcuts
// ========================================

/**
 * Get a document directly by path using the singleton basebase instance
 *
 * @example
 * ```typescript
 * import { getDocByPath } from 'basebase-js';
 *
 * const userSnap = await getDocByPath('users/user123');
 * if (userSnap.exists) {
 *   console.log(userSnap.data());
 * }
 * ```
 */
export function getDocByPath(
  path: string,
  projectName?: string
): Promise<DocumentSnapshot> {
  return getDoc(doc(path, projectName));
}

/**
 * Get all documents in a collection directly by path using the singleton basebase instance
 *
 * @example
 * ```typescript
 * import { getDocsFromCollection } from 'basebase-js';
 *
 * const snapshot = await getDocsFromCollection('users');
 * snapshot.forEach(doc => console.log(doc.data()));
 * ```
 */
export function getDocsFromCollection(
  path: string,
  projectName?: string
): Promise<QuerySnapshot> {
  return getDocs(collection(path, projectName));
}

/**
 * Set a document directly by path using the singleton basebase instance
 *
 * @example
 * ```typescript
 * import { setDocByPath } from 'basebase-js';
 *
 * await setDocByPath('users/user123', {
 *   name: 'John Doe',
 *   email: 'john@example.com'
 * });
 * ```
 */
export function setDocByPath(
  path: string,
  data: BasebaseDocumentData,
  options?: SetOptions,
  projectName?: string
): Promise<WriteResult> {
  return setDoc(doc(path, projectName), data, options);
}

/**
 * Update a document directly by path using the singleton basebase instance
 *
 * @example
 * ```typescript
 * import { updateDocByPath } from 'basebase-js';
 *
 * await updateDocByPath('users/user123', {
 *   age: 31,
 *   'profile.lastLogin': new Date().toISOString()
 * });
 * ```
 */
export function updateDocByPath(
  path: string,
  data: UpdateData,
  projectName?: string
): Promise<WriteResult> {
  return updateDoc(doc(path, projectName), data);
}

/**
 * Delete a document directly by path using the singleton basebase instance
 *
 * @example
 * ```typescript
 * import { deleteDocByPath } from 'basebase-js';
 *
 * await deleteDocByPath('users/user123');
 * ```
 */
export function deleteDocByPath(
  path: string,
  projectName?: string
): Promise<WriteResult> {
  return deleteDoc(doc(path, projectName));
}

/**
 * Add a document to a collection directly by path using the singleton basebase instance
 *
 * @example
 * ```typescript
 * import { addDocToCollection } from 'basebase-js';
 *
 * const docRef = await addDocToCollection('users', {
 *   name: 'John Doe',
 *   email: 'john@example.com'
 * });
 * console.log('New document ID:', docRef.id);
 * ```
 */
export function addDocToCollection(
  collectionPath: string,
  data: BasebaseDocumentData,
  projectName?: string
): Promise<DocumentReference> {
  return addDoc(collection(collectionPath, projectName), data);
}
