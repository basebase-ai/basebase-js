/**
 * BaseBase Query System Module
 * Handles query construction and execution with Firebase-like API
 */

import {
  Basebase,
  CollectionReference,
  Query,
  QueryConstraint,
  WhereConstraint,
  OrderByConstraint,
  LimitConstraint,
  WhereFilterOp,
  OrderByDirection,
  QuerySnapshot,
  BasebaseError,
  BASEBASE_ERROR_CODES,
  BasebaseListResponse,
} from "./types";
import { makeHttpRequest } from "./utils";
import { getAuthHeader } from "./auth";
import {
  QuerySnapshotImpl,
  QueryDocumentSnapshotImpl,
  DocumentReferenceImpl,
} from "./document";

// ========================================
// Query Implementation
// ========================================

class QueryImpl implements Query {
  public readonly basebase: Basebase;
  public readonly path: string;
  public readonly constraints: QueryConstraint[];

  constructor(
    basebase: Basebase,
    path: string,
    constraints: QueryConstraint[] = []
  ) {
    this.basebase = basebase;
    this.path = path;
    this.constraints = constraints;
  }

  /**
   * Adds a where constraint to the query
   */
  where(fieldPath: string, opStr: WhereFilterOp, value: any): Query {
    const whereConstraint: WhereConstraint = {
      type: "where",
      fieldPath,
      opStr,
      value,
    };

    return new QueryImpl(this.basebase, this.path, [
      ...this.constraints,
      whereConstraint,
    ]);
  }

  /**
   * Adds an orderBy constraint to the query
   */
  orderBy(fieldPath: string, directionStr: OrderByDirection = "asc"): Query {
    const orderByConstraint: OrderByConstraint = {
      type: "orderBy",
      fieldPath,
      directionStr,
    };

    return new QueryImpl(this.basebase, this.path, [
      ...this.constraints,
      orderByConstraint,
    ]);
  }

  /**
   * Adds a limit constraint to the query
   */
  limit(limit: number): Query {
    if (limit <= 0) {
      throw new BasebaseError(
        BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
        "Limit must be positive"
      );
    }

    const limitConstraint: LimitConstraint = {
      type: "limit",
      limit,
    };

    return new QueryImpl(this.basebase, this.path, [
      ...this.constraints,
      limitConstraint,
    ]);
  }

  /**
   * Executes the query and returns the results
   */
  async get(): Promise<QuerySnapshot> {
    try {
      const url = this.buildQueryUrl();
      const response = await makeHttpRequest<BasebaseListResponse>(url, {
        method: "GET",
        headers: getAuthHeader(),
      });

      // Process and filter results
      let documents = response.documents || [];

      // Apply client-side filtering and sorting for constraints that BaseBase doesn't support natively
      documents = this.applyClientSideConstraints(documents);

      // Convert to QueryDocumentSnapshots
      const docs = documents.map((doc, index) => {
        const docId = this.extractDocumentId(doc, index);
        const docPath = `${this.path}/${docId}`;
        const docRef = new DocumentReferenceImpl(
          this.basebase,
          docPath,
          docId,
          null as any // We'll fix this type issue later
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
   * Builds the query URL with parameters
   */
  private buildQueryUrl(): string {
    const baseUrl = `${this.basebase.baseUrl}/${this.basebase.projectId}/${this.path}`;
    const queryParams = new URLSearchParams();

    // For now, we'll implement client-side filtering since BaseBase server
    // doesn't have advanced query support yet
    // In the future, this could be enhanced to use server-side filtering

    return (
      baseUrl + (queryParams.toString() ? `?${queryParams.toString()}` : "")
    );
  }

  /**
   * Applies constraints that need to be handled client-side
   */
  private applyClientSideConstraints(documents: any[]): any[] {
    let result = [...documents];

    // Apply where constraints
    const whereConstraints = this.constraints.filter(
      (c) => c.type === "where"
    ) as WhereConstraint[];
    for (const constraint of whereConstraints) {
      result = this.applyWhereConstraint(result, constraint);
    }

    // Apply orderBy constraints
    const orderByConstraints = this.constraints.filter(
      (c) => c.type === "orderBy"
    ) as OrderByConstraint[];
    if (orderByConstraints.length > 0) {
      result = this.applyOrderByConstraints(result, orderByConstraints);
    }

    // Apply limit constraint
    const limitConstraint = this.constraints.find(
      (c) => c.type === "limit"
    ) as LimitConstraint;
    if (limitConstraint) {
      result = result.slice(0, limitConstraint.limit);
    }

    return result;
  }

  /**
   * Applies a where constraint to filter documents
   */
  private applyWhereConstraint(
    documents: any[],
    constraint: WhereConstraint
  ): any[] {
    return documents.filter((doc) => {
      const fieldValue = this.getFieldValue(doc, constraint.fieldPath);
      return this.evaluateWhereCondition(
        fieldValue,
        constraint.opStr,
        constraint.value
      );
    });
  }

  /**
   * Applies orderBy constraints to sort documents
   */
  private applyOrderByConstraints(
    documents: any[],
    constraints: OrderByConstraint[]
  ): any[] {
    return documents.sort((a, b) => {
      for (const constraint of constraints) {
        const aValue = this.getFieldValue(a, constraint.fieldPath);
        const bValue = this.getFieldValue(b, constraint.fieldPath);

        const comparison = this.compareValues(aValue, bValue);
        if (comparison !== 0) {
          return constraint.directionStr === "desc" ? -comparison : comparison;
        }
      }
      return 0;
    });
  }

  /**
   * Gets a field value from MongoDB-style document
   */
  private getFieldValue(doc: any, fieldPath: string): any {
    const pathSegments = fieldPath.split(".");
    let current = doc;

    for (const segment of pathSegments) {
      if (!current || current[segment] === undefined) {
        return undefined;
      }
      current = current[segment];
    }

    return current;
  }

  /**
   * Evaluates a where condition
   */
  private evaluateWhereCondition(
    fieldValue: any,
    operator: WhereFilterOp,
    queryValue: any
  ): boolean {
    switch (operator) {
      case "==":
        return fieldValue === queryValue;
      case "!=":
        return fieldValue !== queryValue;
      case "<":
        return fieldValue < queryValue;
      case "<=":
        return fieldValue <= queryValue;
      case ">":
        return fieldValue > queryValue;
      case ">=":
        return fieldValue >= queryValue;
      case "array-contains":
        return Array.isArray(fieldValue) && fieldValue.includes(queryValue);
      case "in":
        return Array.isArray(queryValue) && queryValue.includes(fieldValue);
      case "not-in":
        return Array.isArray(queryValue) && !queryValue.includes(fieldValue);
      case "array-contains-any":
        return (
          Array.isArray(fieldValue) &&
          Array.isArray(queryValue) &&
          queryValue.some((val) => fieldValue.includes(val))
        );
      default:
        throw new BasebaseError(
          BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
          `Unsupported operator: ${operator}`
        );
    }
  }

  /**
   * Compares two values for sorting
   */
  private compareValues(a: any, b: any): number {
    if (a === b) return 0;
    if (a == null) return -1;
    if (b == null) return 1;

    if (typeof a === "number" && typeof b === "number") {
      return a - b;
    }

    if (typeof a === "string" && typeof b === "string") {
      return a.localeCompare(b);
    }

    if (typeof a === "boolean" && typeof b === "boolean") {
      return a === b ? 0 : a ? 1 : -1;
    }

    // Convert to strings for comparison as last resort
    return String(a).localeCompare(String(b));
  }

  /**
   * Extracts document ID from MongoDB-style document
   */
  private extractDocumentId(doc: any, fallbackIndex: number): string {
    if (doc.name) {
      const nameParts = doc.name.split("/");
      return nameParts[nameParts.length - 1] || `doc_${fallbackIndex}`;
    }

    // Look for an ID field in the document (MongoDB-style)
    const idField = doc.id || doc._id || doc.ID;
    if (idField && typeof idField === "string") {
      return idField;
    }

    return `doc_${fallbackIndex}_${Date.now()}`;
  }
}

// ========================================
// Public Query Functions
// ========================================

/**
 * Creates a query from a collection reference
 */
export function query(
  collection: CollectionReference,
  ...queryConstraints: QueryConstraint[]
): Query {
  return new QueryImpl(collection.basebase, collection.path, queryConstraints);
}

/**
 * Creates a where constraint for filtering
 */
export function where(
  fieldPath: string,
  opStr: WhereFilterOp,
  value: any
): WhereConstraint {
  if (!fieldPath || typeof fieldPath !== "string") {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Field path must be a non-empty string"
    );
  }

  return {
    type: "where",
    fieldPath,
    opStr,
    value,
  };
}

/**
 * Creates an orderBy constraint for sorting
 */
export function orderBy(
  fieldPath: string,
  directionStr: OrderByDirection = "asc"
): OrderByConstraint {
  if (!fieldPath || typeof fieldPath !== "string") {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Field path must be a non-empty string"
    );
  }

  if (directionStr !== "asc" && directionStr !== "desc") {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      'Direction must be "asc" or "desc"'
    );
  }

  return {
    type: "orderBy",
    fieldPath,
    directionStr,
  };
}

/**
 * Creates a limit constraint for limiting results
 */
export function limit(limitValue: number): LimitConstraint {
  if (!Number.isInteger(limitValue) || limitValue <= 0) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Limit must be a positive integer"
    );
  }

  return {
    type: "limit",
    limit: limitValue,
  };
}

/**
 * Creates a startAt constraint (placeholder for future implementation)
 */
export function startAt(...values: any[]): QueryConstraint {
  throw new BasebaseError(
    BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
    "startAt is not yet implemented in BaseBase SDK"
  );
}

/**
 * Creates an endAt constraint (placeholder for future implementation)
 */
export function endAt(...values: any[]): QueryConstraint {
  throw new BasebaseError(
    BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
    "endAt is not yet implemented in BaseBase SDK"
  );
}

// ========================================
// Query Utilities
// ========================================

/**
 * Validates a query constraint
 */
export function validateQueryConstraint(constraint: QueryConstraint): void {
  if (!constraint || typeof constraint !== "object") {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Query constraint must be an object"
    );
  }

  if (!constraint.type) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Query constraint must have a type"
    );
  }
}

/**
 * Checks if a query has a specific type of constraint
 */
export function hasConstraintType(query: Query, type: string): boolean {
  return query.constraints.some((constraint) => constraint.type === type);
}

/**
 * Gets constraints of a specific type from a query
 */
export function getConstraintsOfType<T extends QueryConstraint>(
  query: Query,
  type: string
): T[] {
  return query.constraints.filter(
    (constraint) => constraint.type === type
  ) as T[];
}

// Export the QueryImpl class for use in other modules
export { QueryImpl };
