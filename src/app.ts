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
 * Simple database initialization for server environments
 * Takes a token and returns a ready-to-use database instance
 */
export function getDatabase(token: string): Basebase {
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
        baseUrl: DEFAULT_BASE_URL,
        token: token,
      },
    },
    projectId: "default", // Will be determined from token context
    baseUrl: DEFAULT_BASE_URL,
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
