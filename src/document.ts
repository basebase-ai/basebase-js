/**
 * BaseBase Document Operations Module
 * Handles document references, snapshots, and CRUD operations
 */

import {
  Basebase,
  DocumentReference,
  CollectionReference,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  QuerySnapshot,
  BasebaseDocument,
  BasebaseDocumentData,
  BasebaseError,
  BASEBASE_ERROR_CODES,
  BasebaseListResponse,
  WriteResult,
  SetOptions,
  UpdateData,
} from "./types";
import {
  validatePath,
  validateDocumentId,
  generateId,
  deepClone,
  getNestedProperty,
  validateProjectId,
  isValidProjectId,
} from "./utils";
import { makeDocumentRequest } from "./document_utils";

// ========================================
// Document Reference Implementation
// ========================================

class DocumentReferenceImpl implements DocumentReference {
  public readonly id: string;
  public readonly path: string;
  public readonly basebase: Basebase;
  public readonly parent: CollectionReference;

  constructor(
    basebase: Basebase,
    path: string,
    id: string,
    parent: CollectionReference
  ) {
    this.basebase = basebase;
    this.path = path;
    this.id = id;
    this.parent = parent;
  }

  /**
   * Gets the full API path for this document
   */
  private getApiPath(): string {
    return this.path; // path already includes project ID
  }

  /**
   * Gets the document data from the server
   */
  async get(): Promise<DocumentSnapshot> {
    try {
      const response = await makeDocumentRequest<BasebaseDocumentData>(
        `${this.basebase.baseUrl}/${this.getApiPath()}`,
        "GET"
      );

      return new DocumentSnapshotImpl(this, response, true);
    } catch (error) {
      if (
        error instanceof BasebaseError &&
        error.code === BASEBASE_ERROR_CODES.NOT_FOUND
      ) {
        return new DocumentSnapshotImpl(this, null, false);
      }
      throw error;
    }
  }

  /**
   * Sets the document data, optionally merging with existing data
   */
  async set(
    data: BasebaseDocumentData,
    options?: SetOptions
  ): Promise<WriteResult> {
    if (!data || typeof data !== "object") {
      throw new BasebaseError(
        BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
        "Document data must be an object"
      );
    }

    let requestData = data;

    // Handle merge options
    if (options?.merge || options?.mergeFields) {
      try {
        const existingDoc = await this.get();
        if (existingDoc.exists) {
          const existingData = existingDoc.data();
          if (existingData) {
            if (options.merge) {
              requestData = { ...existingData, ...data };
            } else if (options.mergeFields) {
              requestData = { ...existingData };
              for (const field of options.mergeFields) {
                if (field in data) {
                  requestData[field] = data[field];
                }
              }
            }
          }
        }
      } catch (error) {
        // If document doesn't exist, just use the new data
        if (
          !(
            error instanceof BasebaseError &&
            error.code === BASEBASE_ERROR_CODES.NOT_FOUND
          )
        ) {
          throw error;
        }
      }
    }

    const response = await makeDocumentRequest<BasebaseDocumentData>(
      `${this.basebase.baseUrl}/${this.getApiPath()}`,
      "PUT",
      requestData,
      options
    );

    return {
      writeTime: response.updateTime || new Date().toISOString(),
    };
  }

  /**
   * Updates specific fields in the document
   */
  async update(data: UpdateData): Promise<WriteResult> {
    if (!data || typeof data !== "object") {
      throw new BasebaseError(
        BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
        "Update data must be an object"
      );
    }

    const response = await makeDocumentRequest<BasebaseDocumentData>(
      `${this.basebase.baseUrl}/${this.getApiPath()}`,
      "PATCH",
      data
    );

    return {
      writeTime: response.updateTime || new Date().toISOString(),
    };
  }

  /**
   * Deletes the document
   */
  async delete(): Promise<WriteResult> {
    await makeDocumentRequest(
      `${this.basebase.baseUrl}/${this.getApiPath()}`,
      "DELETE"
    );

    return {
      writeTime: new Date().toISOString(),
    };
  }

  /**
   * Returns a reference to a subcollection
   */
  collection(collectionPath: string): CollectionReference {
    validatePath(collectionPath);
    const fullPath = `${this.path}/${collectionPath}`;
    return new CollectionReferenceImpl(this.basebase, fullPath, this);
  }

  /**
   * Checks equality with another document reference
   */
  isEqual(other: DocumentReference): boolean {
    return (
      this.basebase === other.basebase &&
      this.path === other.path &&
      this.id === other.id
    );
  }
}

// ========================================
// Collection Reference Implementation
// ========================================

class CollectionReferenceImpl implements CollectionReference {
  public readonly id: string;
  public readonly path: string;
  public readonly basebase: Basebase;
  public readonly parent?: DocumentReference;

  constructor(basebase: Basebase, path: string, parent?: DocumentReference) {
    this.basebase = basebase;
    this.path = path;
    this.parent = parent;

    // Extract collection ID from path
    const pathSegments = path.split("/");
    this.id = pathSegments[pathSegments.length - 1] || "";
  }

  /**
   * Gets the full API path for this collection
   */
  private getApiPath(): string {
    return this.path; // path already includes project ID
  }

  /**
   * Gets all documents in this collection
   */
  async get(): Promise<QuerySnapshot> {
    try {
      const response = await makeDocumentRequest<BasebaseListResponse>(
        `${this.basebase.baseUrl}/${this.getApiPath()}`,
        "GET"
      );

      const docs = response.documents.map((doc, index) => {
        const docId = this.extractDocumentId(doc, index);
        const docRef = new DocumentReferenceImpl(
          this.basebase,
          `${this.path}/${docId}`,
          docId,
          this
        );
        return new QueryDocumentSnapshotImpl(docRef, doc);
      });

      return new QuerySnapshotImpl(docs);
    } catch (error) {
      if (
        error instanceof BasebaseError &&
        error.code === BASEBASE_ERROR_CODES.NOT_FOUND
      ) {
        return new QuerySnapshotImpl([]);
      }
      throw error;
    }
  }

  /**
   * Creates a new document reference with an auto-generated ID
   */
  doc(): DocumentReference;
  /**
   * Creates a document reference with the specified ID
   */
  doc(documentId: string): DocumentReference;
  doc(documentId?: string): DocumentReference {
    const id = documentId || generateId();
    validateDocumentId(id);

    const docPath = `${this.path}/${id}`;
    return new DocumentReferenceImpl(this.basebase, docPath, id, this);
  }

  /**
   * Adds a new document with server-generated ID
   */
  async add(data: BasebaseDocumentData): Promise<DocumentReference> {
    if (!data || typeof data !== "object") {
      throw new BasebaseError(
        BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
        "Document data must be an object"
      );
    }

    const response = await makeDocumentRequest<BasebaseDocumentData>(
      `${this.basebase.baseUrl}/${this.getApiPath()}`,
      "POST",
      data
    );

    // Extract the server-assigned ID from the response
    const serverId = this.extractDocumentId(response, 0);

    // Create a new document reference with the server-assigned ID
    const docPath = `${this.path}/${serverId}`;
    return new DocumentReferenceImpl(this.basebase, docPath, serverId, this);
  }

  /**
   * Checks equality with another collection reference
   */
  isEqual(other: CollectionReference): boolean {
    return this.basebase === other.basebase && this.path === other.path;
  }

  /**
   * Extracts document ID from BaseBase document
   */
  private extractDocumentId(
    doc: BasebaseDocumentData,
    fallbackIndex: number
  ): string {
    // Try to extract ID from document name or fields
    if (doc.name) {
      const nameParts = doc.name.split("/");
      return nameParts[nameParts.length - 1] || `fallback_${fallbackIndex}`;
    }

    // Look for an ID field in the document
    const idField = doc.id || doc._id || doc.ID;
    if (idField && typeof idField === "string") {
      return idField;
    }

    // Fallback to generating an ID
    return `doc_${fallbackIndex}_${Date.now()}`;
  }
}

// ========================================
// Document Snapshot Implementation
// ========================================

class DocumentSnapshotImpl implements DocumentSnapshot {
  public readonly id: string;
  public readonly ref: DocumentReference;
  public readonly exists: boolean;
  private readonly _data: BasebaseDocumentData | undefined;

  constructor(
    ref: DocumentReference,
    document: BasebaseDocumentData | null,
    exists: boolean
  ) {
    this.ref = ref;
    this.id = ref.id;
    this.exists = exists;
    this._data = document || undefined;
  }

  /**
   * Gets the document data
   */
  data(): BasebaseDocumentData | undefined {
    return this._data ? deepClone(this._data) : undefined;
  }

  /**
   * Gets a specific field from the document
   */
  get(fieldPath: string): any {
    if (!this._data) {
      return undefined;
    }

    return getNestedProperty(this._data, fieldPath);
  }
}

// ========================================
// Query Document Snapshot Implementation
// ========================================

class QueryDocumentSnapshotImpl
  extends DocumentSnapshotImpl
  implements QueryDocumentSnapshot
{
  constructor(ref: DocumentReference, document: BasebaseDocumentData) {
    super(ref, document, true);
  }

  /**
   * Gets the document data (guaranteed to exist)
   */
  data(): BasebaseDocumentData {
    const data = super.data();
    if (!data) {
      throw new BasebaseError(
        BASEBASE_ERROR_CODES.INTERNAL,
        "Query document snapshot should always have data"
      );
    }
    return data;
  }
}

// ========================================
// Query Snapshot Implementation
// ========================================

class QuerySnapshotImpl implements QuerySnapshot {
  public readonly docs: QueryDocumentSnapshot[];
  public readonly empty: boolean;
  public readonly size: number;

  constructor(docs: QueryDocumentSnapshot[]) {
    this.docs = docs;
    this.size = docs.length;
    this.empty = docs.length === 0;
  }

  /**
   * Executes a callback for each document
   */
  forEach(callback: (doc: QueryDocumentSnapshot) => void): void {
    this.docs.forEach(callback);
  }
}

// ========================================
// Public API Functions
// ========================================

/**
 * Creates a document reference
 */
export function doc(
  db: Basebase,
  path: string,
  projectName?: string
): DocumentReference {
  validatePath(path);

  // Always use the explicitly provided project, or default to current project
  // Never try to auto-detect project from path
  const targetProjectId = projectName || db.projectId;

  const pathSegments = path.split("/");

  // Document paths need at least 2 segments: collection/document
  if (pathSegments.length < 2) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Document path must include both collection and document ID (e.g., 'users/user123'). " +
        "To specify a different project, use the projectName parameter: doc(db, 'users/user123', 'projectName')"
    );
  }

  const documentId = pathSegments[pathSegments.length - 1];
  if (!documentId) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Document ID cannot be empty"
    );
  }

  validateDocumentId(documentId);

  const collectionPath = pathSegments.slice(0, -1).join("/");
  const collectionRef = collection(db, collectionPath, projectName);

  // Build the full path for API calls - path is always relative to the specified project
  const fullPath = `${targetProjectId}/${path}`;

  return new DocumentReferenceImpl(db, fullPath, documentId, collectionRef);
}

/**
 * Creates a collection reference
 */
export function collection(
  db: Basebase,
  path: string,
  projectName?: string
): CollectionReference {
  validatePath(path);

  // Always use the explicitly provided project, or default to current project
  // Never try to auto-detect project from path
  const targetProjectId = projectName || db.projectId;

  const pathSegments = path.split("/");

  // Collection paths need at least 1 segment: collection
  if (pathSegments.length < 1 || pathSegments[pathSegments.length - 1] === "") {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Collection path must include a collection name (e.g., 'users' or 'users/user123/posts'). " +
        "To specify a different project, use the projectName parameter: collection(db, 'users', 'projectName')"
    );
  }

  let parent: DocumentReference | undefined;
  if (pathSegments.length > 1) {
    const parentPath = pathSegments.slice(0, -1).join("/");
    parent = doc(db, parentPath, projectName);
  }

  // Build the full path for API calls - path is always relative to the specified project
  const fullPath = `${targetProjectId}/${path}`;

  return new CollectionReferenceImpl(db, fullPath, parent);
}

/**
 * Gets a document snapshot
 */
export async function getDoc(
  docRef: DocumentReference
): Promise<DocumentSnapshot> {
  return docRef.get();
}

/**
 * Gets a collection of documents
 */
export async function getDocs(
  collectionRef: CollectionReference
): Promise<QuerySnapshot> {
  return collectionRef.get();
}

/**
 * Updates document data
 */
export async function updateDoc(
  docRef: DocumentReference,
  data: UpdateData
): Promise<WriteResult> {
  return docRef.update(data);
}

/**
 * Deletes a document
 */
export async function deleteDoc(
  docRef: DocumentReference
): Promise<WriteResult> {
  return docRef.delete();
}

/**
 * Adds a document to a collection
 */
export async function addDoc(
  collectionRef: CollectionReference,
  data: BasebaseDocumentData
): Promise<DocumentReference> {
  return collectionRef.add(data);
}

/**
 * Sets a document with a specific ID, optionally merging with existing data
 */
export async function setDoc(
  docRef: DocumentReference,
  data: BasebaseDocumentData,
  options?: SetOptions
): Promise<WriteResult> {
  // Validate that the document ID follows project naming rules
  if (isValidProjectId(docRef.id)) {
    validateProjectId(docRef.id);
  }

  return docRef.set(data, options);
}

// Export the implementations for use in other modules
export {
  DocumentReferenceImpl,
  CollectionReferenceImpl,
  DocumentSnapshotImpl,
  QueryDocumentSnapshotImpl,
  QuerySnapshotImpl,
};
