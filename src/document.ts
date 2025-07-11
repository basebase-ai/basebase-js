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
  makeHttpRequest,
  toBasebaseDocument,
  fromBasebaseDocument,
  validatePath,
  validateDocumentId,
  buildPath,
  generateId,
  deepClone,
  getNestedProperty,
} from "./utils";
import { getAuthHeader } from "./auth";

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
    return buildPath(this.basebase.projectId, this.path);
  }

  /**
   * Gets the document data from the server
   */
  async get(): Promise<DocumentSnapshot> {
    try {
      const response = await makeHttpRequest<BasebaseDocument>(
        `${this.basebase.baseUrl}/${this.getApiPath()}`,
        {
          method: "GET",
          headers: getAuthHeader(),
        }
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
   * Sets the document data
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

    const document = toBasebaseDocument(data);
    const url = `${this.basebase.baseUrl}/${this.getApiPath()}`;

    try {
      if (options?.merge) {
        // For merge operations, use PATCH
        const response = await makeHttpRequest<BasebaseDocument>(url, {
          method: "PATCH",
          headers: getAuthHeader(),
          body: document,
        });

        return {
          writeTime: response.updateTime || new Date().toISOString(),
        };
      } else {
        // For set operations, use POST with documentId parameter
        const queryParam = `?documentId=${encodeURIComponent(this.id)}`;
        const response = await makeHttpRequest<BasebaseDocument>(
          `${url}${queryParam}`,
          {
            method: "POST",
            headers: getAuthHeader(),
            body: document,
          }
        );

        return {
          writeTime: response.createTime || new Date().toISOString(),
        };
      }
    } catch (error) {
      throw error;
    }
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

    const document = toBasebaseDocument(data);
    const url = `${this.basebase.baseUrl}/${this.getApiPath()}`;

    try {
      const response = await makeHttpRequest<BasebaseDocument>(url, {
        method: "PATCH",
        headers: getAuthHeader(),
        body: document,
      });

      return {
        writeTime: response.updateTime || new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Deletes the document
   */
  async delete(): Promise<WriteResult> {
    const url = `${this.basebase.baseUrl}/${this.getApiPath()}`;

    try {
      await makeHttpRequest(url, {
        method: "DELETE",
        headers: getAuthHeader(),
      });

      return {
        writeTime: new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
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
    return buildPath(this.basebase.projectId, this.path);
  }

  /**
   * Gets all documents in this collection
   */
  async get(): Promise<QuerySnapshot> {
    try {
      const response = await makeHttpRequest<BasebaseListResponse>(
        `${this.basebase.baseUrl}/${this.getApiPath()}`,
        {
          method: "GET",
          headers: getAuthHeader(),
        }
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
   * Adds a new document with auto-generated ID
   */
  async add(data: BasebaseDocumentData): Promise<DocumentReference> {
    const docRef = this.doc();
    await docRef.set(data);
    return docRef;
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
    doc: BasebaseDocument,
    fallbackIndex: number
  ): string {
    // Try to extract ID from document name or fields
    if (doc.name) {
      const nameParts = doc.name.split("/");
      return nameParts[nameParts.length - 1] || `fallback_${fallbackIndex}`;
    }

    // Look for an ID field in the document
    if (doc.fields) {
      const idField = doc.fields.id || doc.fields._id || doc.fields.ID;
      if (idField?.stringValue) {
        return idField.stringValue;
      }
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
    document: BasebaseDocument | null,
    exists: boolean
  ) {
    this.ref = ref;
    this.id = ref.id;
    this.exists = exists;
    this._data = document ? fromBasebaseDocument(document) : undefined;
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
  constructor(ref: DocumentReference, document: BasebaseDocument) {
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
export function doc(basebase: Basebase, path: string): DocumentReference {
  validatePath(path);

  const pathSegments = path.split("/");
  if (pathSegments.length % 2 === 0) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Document path must have an odd number of segments"
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
  const collectionRef = collection(basebase, collectionPath);

  return new DocumentReferenceImpl(basebase, path, documentId, collectionRef);
}

/**
 * Creates a collection reference
 */
export function collection(
  basebase: Basebase,
  path: string
): CollectionReference {
  validatePath(path);

  const pathSegments = path.split("/");
  if (pathSegments.length % 2 === 1) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Collection path must have an even number of segments"
    );
  }

  let parent: DocumentReference | undefined;
  if (pathSegments.length > 1) {
    const parentPath = pathSegments.slice(0, -1).join("/");
    parent = doc(basebase, parentPath);
  }

  return new CollectionReferenceImpl(basebase, path, parent);
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
 * Sets document data
 */
export async function setDoc(
  docRef: DocumentReference,
  data: BasebaseDocumentData,
  options?: SetOptions
): Promise<WriteResult> {
  return docRef.set(data, options);
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

// Export the implementations for use in other modules
export {
  DocumentReferenceImpl,
  CollectionReferenceImpl,
  DocumentSnapshotImpl,
  QueryDocumentSnapshotImpl,
  QuerySnapshotImpl,
};
