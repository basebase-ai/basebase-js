/**
 * BaseBase App Initialization Module
 * Handles app creation and BaseBase instance management
 */

import {
  BasebaseApp,
  BasebaseConfig,
  Basebase,
  BasebaseError,
  BASEBASE_ERROR_CODES,
} from "./types";
import { getProject, getToken, getAuthState, setDirectToken } from "./auth";

// Constants
export const DEFAULT_BASE_URL = "https://api.basebase.us";

/**
 * Database initialization for server environments
 *
 * @param tokenOrOptions - Either a JWT token string (legacy) or BasebaseConfig object
 * @returns A ready-to-use database instance
 *
 * @example
 * ```typescript
 * // Legacy usage
 * const db = getDatabase("your_jwt_token");
 *
 * // New usage with custom base URL
 * const db = getDatabase({
 *   token: "your_jwt_token",
 *   baseUrl: "http://localhost:8000"
 * });
 * ```
 */
export function getDatabase(tokenOrOptions: string | BasebaseConfig): Basebase {
  let token: string;
  let baseUrl: string = DEFAULT_BASE_URL;

  // Handle both legacy string parameter and new options object
  if (typeof tokenOrOptions === "string") {
    token = tokenOrOptions;
  } else if (typeof tokenOrOptions === "object" && tokenOrOptions !== null) {
    token = tokenOrOptions.token || "";
    baseUrl = tokenOrOptions.baseUrl || DEFAULT_BASE_URL;
  } else {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "getDatabase requires either a token string or BasebaseConfig object with token"
    );
  }

  if (!token || typeof token !== "string") {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Token must be a non-empty string"
    );
  }

  // Set the token for this instance
  setDirectToken(token);

  // Create and return a database instance
  const instance: Basebase = {
    app: {
      name: "[SERVER]",
      options: {
        baseUrl: baseUrl,
        token: token,
      },
    },
    projectId: "default", // Will be determined from token context
    baseUrl: baseUrl,
  };

  return instance;
}

/**
 * Default BaseBase instance that requires authentication
 * This provides a Firebase-like experience where you can import { db } directly
 */
export const db: Basebase = new Proxy({} as Basebase, {
  get(target, prop) {
    // Check if user is authenticated
    const authState = getAuthState();
    if (!authState.isAuthenticated || !authState.project) {
      throw new BasebaseError(
        BASEBASE_ERROR_CODES.UNAUTHENTICATED,
        "You must be authenticated to use the database. Call verifyCode() first."
      );
    }

    // Create a simple instance for authenticated users
    const instance: Basebase = {
      app: {
        name: "[BROWSER]",
        options: {
          projectId: authState.project.id,
          token: authState.token || undefined,
          baseUrl: DEFAULT_BASE_URL,
        },
      },
      projectId: authState.project.id,
      baseUrl: DEFAULT_BASE_URL,
    };

    return instance[prop as keyof Basebase];
  },
});
