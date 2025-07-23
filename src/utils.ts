/**
 * Utility functions for BaseBase SDK
 * Handles data conversion, HTTP requests, and common operations
 */

import {
  BasebaseValue,
  BasebaseDocument,
  BasebaseDocumentData,
  BasebaseError,
  BASEBASE_ERROR_CODES,
  BasebaseApiResponse,
  BasebaseUser,
  BasebaseProject,
  API_VERSION,
} from "./types";

// ========================================
// Data Conversion Utilities
// ========================================

/**
 * Converts a JavaScript value to BaseBase format
 */
export function toBasebaseValue(value: any): BasebaseValue {
  if (value === null) {
    return { nullValue: null };
  }
  if (typeof value === "string") {
    return { stringValue: value };
  }
  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      return { integerValue: value.toString() };
    }
    return { doubleValue: value };
  }
  if (typeof value === "boolean") {
    return { booleanValue: value };
  }
  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map(toBasebaseValue),
      },
    };
  }
  if (typeof value === "object") {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value).map(([k, v]) => [k, toBasebaseValue(v)])
        ),
      },
    };
  }
  // Fallback for any other type
  return { stringValue: String(value) };
}

/**
 * Converts BaseBase format to JavaScript value
 * Parses Firebase-like field values (stringValue, timestampValue, etc.)
 */
export function fromBasebaseValue(value: BasebaseValue): any {
  if (value.stringValue !== undefined) {
    return value.stringValue;
  }
  if (value.integerValue !== undefined) {
    return parseInt(value.integerValue, 10);
  }
  if (value.doubleValue !== undefined) {
    return value.doubleValue;
  }
  if (value.booleanValue !== undefined) {
    return value.booleanValue;
  }
  if (value.nullValue !== undefined) {
    return null;
  }
  if (value.timestampValue !== undefined) {
    return new Date(value.timestampValue);
  }
  if (value.arrayValue) {
    return value.arrayValue.values.map(fromBasebaseValue);
  }
  if (value.mapValue) {
    const result: any = {};
    for (const [key, val] of Object.entries(value.mapValue.fields)) {
      result[key] = fromBasebaseValue(val);
    }
    return result;
  }
  // Fallback for any other type
  return value;
}

/**
 * Converts JavaScript object to BaseBase document format
 */
export function toBasebaseDocument(
  data: BasebaseDocumentData
): BasebaseDocument {
  return {
    fields: Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, toBasebaseValue(value)])
    ),
  };
}

/**
 * Converts BaseBase document to JavaScript object
 * Parses Firebase-like document format with fields
 */
export function fromBasebaseDocument(
  doc: BasebaseDocument
): BasebaseDocumentData {
  if (!doc.fields) {
    return {};
  }

  const result: BasebaseDocumentData = {};
  for (const [key, value] of Object.entries(doc.fields)) {
    result[key] = fromBasebaseValue(value);
  }
  return result;
}

// ========================================
// HTTP Client Utilities
// ========================================

export interface HttpRequestOptions {
  method: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

/**
 * Makes HTTP requests with proper error handling
 */
export async function makeHttpRequest<T = any>(
  url: string,
  options: HttpRequestOptions
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = options.timeout
    ? setTimeout(() => controller.abort(), options.timeout)
    : null;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    const fetchOptions: RequestInit = {
      method: options.method,
      headers,
      signal: controller.signal,
    };

    if (options.body && options.method !== "GET") {
      fetchOptions.body =
        typeof options.body === "string"
          ? options.body
          : JSON.stringify(options.body);
    }

    const response = await fetch(url, fetchOptions);

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errorBody: any = null;
      let errorCode: string = BASEBASE_ERROR_CODES.INTERNAL;

      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          errorBody = await response.json();
          if (errorBody.error) {
            errorMessage = errorBody.error;
          } else if (errorBody.message) {
            errorMessage = errorBody.message;
          }
        } else {
          const textBody = await response.text();
          errorMessage = textBody || errorMessage;
        }
      } catch (parseError) {}

      // Map HTTP status codes to BaseBase error codes
      switch (response.status) {
        case 401:
          errorCode = BASEBASE_ERROR_CODES.UNAUTHENTICATED;
          break;
        case 403:
          errorCode = BASEBASE_ERROR_CODES.PERMISSION_DENIED;
          break;
        case 404:
          errorCode = BASEBASE_ERROR_CODES.NOT_FOUND;
          break;
        case 400:
          errorCode = BASEBASE_ERROR_CODES.INVALID_ARGUMENT;
          break;
        case 409:
          errorCode = BASEBASE_ERROR_CODES.ALREADY_EXISTS;
          break;
        case 503:
          errorCode = BASEBASE_ERROR_CODES.UNAVAILABLE;
          break;
        default:
          errorCode = BASEBASE_ERROR_CODES.INTERNAL;
      }

      throw new BasebaseError(errorCode, errorMessage);
    }

    // Handle empty responses
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return {} as T;
    }

    return await response.json();
  } catch (error) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (error instanceof BasebaseError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new BasebaseError(
        BASEBASE_ERROR_CODES.UNAVAILABLE,
        "Request timeout"
      );
    }

    throw new BasebaseError(
      BASEBASE_ERROR_CODES.NETWORK_ERROR,
      `Server error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// ========================================
// Path and Validation Utilities
// ========================================

/**
 * Validates a collection or document path
 */
export function validatePath(path: string): void {
  if (!path || typeof path !== "string") {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Path must be a non-empty string"
    );
  }

  if (path.startsWith("/") || path.endsWith("/")) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Path cannot start or end with a slash"
    );
  }

  const segments = path.split("/");
  if (segments.some((segment) => segment === "")) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Path cannot contain empty segments"
    );
  }
}

/**
 * Validates a document ID
 * Allows URL-safe strings up to 255 characters
 */
export function validateDocumentId(id: string): void {
  if (!id || typeof id !== "string") {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Document ID must be a non-empty string"
    );
  }

  if (id.includes("/")) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Document ID cannot contain slashes"
    );
  }

  if (id.length > 255) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Document ID must be 255 characters or less"
    );
  }

  // Allow URL-safe characters: alphanumeric, hyphens, underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Document ID must contain only URL-safe characters (a-z, A-Z, 0-9, _, -)"
    );
  }
}

/**
 * Validates that a string is a valid project or document ID format
 * Allows URL-safe strings under 24 characters
 */
export function validateProjectId(id: string): void {
  if (!id || typeof id !== "string") {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Project ID must be a non-empty string"
    );
  }

  if (id.length > 24) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Project ID must be 24 characters or less"
    );
  }

  // URL-safe characters: alphanumeric, hyphens, underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Project ID must contain only URL-safe characters (a-z, A-Z, 0-9, _, -)"
    );
  }
}

/**
 * Validates a collection name
 * Collection names must be lowercase and can only contain lowercase letters, numbers, hyphens, and underscores
 */
export function validateCollectionName(name: string): void {
  if (!name || typeof name !== "string") {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Collection name must be a non-empty string"
    );
  }

  if (name.includes("/")) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Collection name cannot contain slashes"
    );
  }

  if (name.length > 255) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Collection name must be 255 characters or less"
    );
  }

  // Must be lowercase letters, numbers, hyphens, and underscores only
  if (!/^[a-z0-9_-]+$/.test(name)) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Collection name must be lowercase and contain only lowercase letters (a-z), numbers (0-9), hyphens (-), and underscores (_). Use underscores to separate words (e.g., 'user_preferences'). Camel case is not allowed."
    );
  }
}

/**
 * Checks if a string is a valid project ID format
 */
export function isValidProjectId(id: string): boolean {
  try {
    validateProjectId(id);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a path is absolute (contains project ID) or relative
 */
export function isAbsolutePath(path: string): boolean {
  const segments = path.split("/");
  // Simple rule: if path has 3+ segments, it's likely absolute (projectId/collection/document)
  // if path has exactly 2 segments, it's likely relative (collection/document)
  return segments.length >= 3;
}

/**
 * Resolves a path to absolute format, handling both relative and absolute paths
 */
export function resolvePath(defaultProjectId: string, path: string): string {
  validatePath(path);

  // If the path looks absolute (3+ segments), use as-is
  if (isAbsolutePath(path)) {
    return path;
  }

  // Otherwise, treat as relative and prepend the default project ID
  return `${defaultProjectId}/${path}`;
}

/**
 * Builds a full path from project ID and relative path (legacy function)
 */
export function buildPath(projectId: string, path: string): string {
  return resolvePath(projectId, path);
}

/**
 * Extracts project ID and path from a full absolute path
 */
export function parsePath(fullPath: string): {
  projectId: string;
  path: string;
} {
  const parts = fullPath.split("/");
  if (parts.length < 2 || !parts[0]) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Invalid path format"
    );
  }

  return {
    projectId: parts[0],
    path: parts.slice(1).join("/"),
  };
}

/**
 * Builds Firebase-style API path for documents and collections
 * Converts internal path format to Firebase API format:
 * /v1/projects/{projectId}/databases/(default)/documents/{collectionPath}/{documentId}
 */
export function buildFirebaseApiPath(
  baseUrl: string,
  projectId: string,
  collectionPath: string,
  documentId?: string
): string {
  const basePath = `${baseUrl}/${API_VERSION}/projects/${projectId}/databases/(default)/documents/${collectionPath}`;
  return documentId ? `${basePath}/${documentId}` : basePath;
}

/**
 * Builds Firebase-style API path for task execution
 * /v1/projects/{projectId}/tasks/{taskName}:do
 */
export function buildTaskDoPath(
  baseUrl: string,
  projectId: string,
  taskName: string
): string {
  return `${baseUrl}/${API_VERSION}/projects/${projectId}/tasks/${taskName}:do`;
}

// ========================================
// Miscellaneous Utilities
// ========================================

/**
 * Extracts or derives project ID from BaseBase API key
 */
export function getProjectIdFromApiKey(apiKey: string): string {
  if (!apiKey || typeof apiKey !== "string") {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "API key must be a non-empty string"
    );
  }

  // If API key follows format bb_projectId_... extract the project ID
  if (apiKey.startsWith("bb_")) {
    const parts = apiKey.split("_");
    if (parts.length >= 3 && parts[1]) {
      return parts[1]; // Extract project ID from bb_projectId_rest
    }
  }

  // Fallback: Create a consistent project identifier from the API key
  // Use a portion of the API key to ensure consistency across sessions
  const hash = apiKey.replace(/[^a-zA-Z0-9]/g, "");
  return hash.substring(0, Math.min(hash.length, 16));
}

/**
 * Generates a random document ID
 */
export function generateId(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 20; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Deep clones an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any;
  }

  if (Array.isArray(obj)) {
    return obj.map(deepClone) as any;
  }

  const cloned = {} as any;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }

  return cloned;
}

/**
 * Checks if we're running in a browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

/**
 * Parses a Firebase-like user object to BasebaseUser
 */
export function parseUserFromFields(rawUser: {
  name: string;
  fields: Record<string, BasebaseValue>;
}): BasebaseUser {
  const fields = fromBasebaseDocument({ fields: rawUser.fields });

  // Extract ID from the name field (e.g., "users/user_id" -> "user_id")
  const id = rawUser.name.split("/").pop() || "";

  return {
    id,
    name: fields.name || "",
    phone: fields.phone || "",
    createdAt: fields.createdAt,
    updatedAt: fields.updatedAt,
  };
}

/**
 * Parses a Firebase-like project object to BasebaseProject
 */
export function parseProjectFromFields(rawProject: {
  name: string;
  fields: Record<string, BasebaseValue>;
}): BasebaseProject {
  const fields = fromBasebaseDocument({ fields: rawProject.fields });

  // Extract ID from the name field (e.g., "projects/project_id" -> "project_id")
  const id = rawProject.name.split("/").pop() || "";

  return {
    id,
    name: fields.displayName || fields.name || "",
    displayName: fields.displayName,
    description: fields.description,
    ownerId: fields.ownerId,
    createdAt: fields.createdAt,
    updatedAt: fields.updatedAt,
  };
}

/**
 * Safely gets a nested property from an object
 */
export function getNestedProperty(obj: any, path: string): any {
  return path.split(".").reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}
