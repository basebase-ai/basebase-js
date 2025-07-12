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
} from "./types";

// ========================================
// Data Conversion Utilities
// ========================================

/**
 * Converts a JavaScript value to BaseBase format (MongoDB-style)
 * Now just returns the value as-is for MongoDB compatibility
 */
export function toBasebaseValue(value: any): any {
  return value;
}

/**
 * Converts BaseBase format to JavaScript value (MongoDB-style)
 * Now just returns the value as-is for MongoDB compatibility
 */
export function fromBasebaseValue(value: any): any {
  return value;
}

/**
 * Converts JavaScript object to BaseBase document format (MongoDB-style)
 * Now sends raw JavaScript objects to match MongoDB format
 */
export function toBasebaseDocument(
  data: BasebaseDocumentData
): BasebaseDocumentData {
  // Just return the data as-is for MongoDB compatibility
  return data;
}

/**
 * Converts BaseBase document to JavaScript object (MongoDB-style)
 * Now expects raw JavaScript objects from MongoDB
 */
export function fromBasebaseDocument(
  doc: BasebaseDocumentData
): BasebaseDocumentData {
  // Just return the data as-is for MongoDB compatibility
  return doc;
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
      let errorCode: string = BASEBASE_ERROR_CODES.INTERNAL;

      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // Use default error message if response isn't JSON
      }

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
      `Network error: ${
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

  if (id.startsWith(".") || id.startsWith("_")) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Document ID cannot start with a dot or underscore"
    );
  }
}

/**
 * Validates that a string is a valid MongoDB ObjectID format (24 hex characters)
 */
export function validateObjectId(id: string): void {
  if (!id || typeof id !== "string") {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "ObjectID must be a non-empty string"
    );
  }

  if (id.length !== 24) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "ObjectID must be exactly 24 characters long"
    );
  }

  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "ObjectID must contain only hexadecimal characters (0-9, a-f, A-F)"
    );
  }
}

/**
 * Checks if a string is a valid MongoDB ObjectID format
 */
export function isValidObjectId(id: string): boolean {
  try {
    validateObjectId(id);
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
 * Safely gets a nested property from an object
 */
export function getNestedProperty(obj: any, path: string): any {
  return path.split(".").reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}
