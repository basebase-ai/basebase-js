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
import { getProject, getToken, getAuthState } from "./auth";

// Constants
export const DEFAULT_BASE_URL = "https://api.basebase.us";

// App Registry
const appRegistry = new Map<string, BasebaseApp>();
const basebaseRegistry = new Map<string, Basebase>();

/**
 * Initializes a BaseBase app with the given configuration
 */
export function initializeApp(
  config: BasebaseConfig,
  name: string = "[DEFAULT]"
): BasebaseApp {
  if (appRegistry.has(name)) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.ALREADY_EXISTS,
      `App named "${name}" already exists`
    );
  }

  validateConfig(config);

  const normalizedConfig = {
    projectId: config.projectId,
    baseUrl: config.baseUrl || DEFAULT_BASE_URL,
    token: config.token,
  };

  const app: BasebaseApp = {
    name,
    options: normalizedConfig,
  };

  appRegistry.set(name, app);
  return app;
}

/**
 * Gets an existing BaseBase app by name
 */
export function getApp(name: string = "[DEFAULT]"): BasebaseApp {
  const app = appRegistry.get(name);
  if (!app) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.NOT_FOUND,
      `No BaseBase app named "${name}" found. Initialize it first with initializeApp().`
    );
  }
  return app;
}

/**
 * Gets all registered BaseBase apps
 */
export function getApps(): BasebaseApp[] {
  return Array.from(appRegistry.values());
}

/**
 * Deletes a BaseBase app and cleans up its resources
 */
export function deleteApp(app: BasebaseApp): Promise<void> {
  return new Promise((resolve) => {
    appRegistry.delete(app.name);
    basebaseRegistry.delete(app.name);
    resolve();
  });
}

/**
 * Gets a BaseBase instance for the given app
 */
export function getBasebase(app?: BasebaseApp): Basebase {
  if (!app) {
    app = getApp();
  }

  let basebase = basebaseRegistry.get(app.name);

  if (!basebase) {
    basebase = createBasebaseInstance(app);
    basebaseRegistry.set(app.name, basebase);
  }

  return basebase;
}

/**
 * Creates a new BaseBase instance from an app
 */
function createBasebaseInstance(app: BasebaseApp): Basebase {
  const instance: Basebase = {
    app,
    projectId: app.options.projectId || getProject()?.name || "default",
    baseUrl: app.options.baseUrl || DEFAULT_BASE_URL,
  };

  return instance;
}

/**
 * Validates a BaseBase configuration object
 */
export function validateConfig(config: BasebaseConfig): void {
  if (!config || typeof config !== "object") {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Configuration must be an object"
    );
  }

  // Validate base URL if provided
  if (config.baseUrl) {
    try {
      new URL(config.baseUrl);
    } catch {
      throw new BasebaseError(
        BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
        "Invalid base URL format"
      );
    }
  }

  // Validate project ID format if provided
  if (config.projectId) {
    const projectIdRegex = /^[a-z0-9][a-z0-9_]*[a-z0-9]$/;
    if (config.projectId.length < 3 || config.projectId.length > 30) {
      throw new BasebaseError(
        BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
        "Project ID must be between 3 and 30 characters"
      );
    }

    if (!projectIdRegex.test(config.projectId)) {
      throw new BasebaseError(
        BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
        "Project ID must contain only lowercase letters, numbers, and underscores, and cannot start or end with an underscore"
      );
    }
  }
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

    // Get or create the default instance
    const defaultApp = hasApp()
      ? getApp()
      : initializeApp({
          projectId: authState.project.id,
          token: authState.token || undefined,
          baseUrl: DEFAULT_BASE_URL,
        });

    const instance = getBasebase(defaultApp);
    return instance[prop as keyof Basebase];
  },
});

/**
 * Checks if an app with the given name exists
 */
export function hasApp(name: string = "[DEFAULT]"): boolean {
  return appRegistry.has(name);
}

/**
 * Gets the configuration for an app
 */
export function getAppConfig(name: string = "[DEFAULT]"): BasebaseConfig {
  const app = getApp(name);
  return { ...app.options };
}

/**
 * Clears all app registrations (useful for testing)
 */
export function clearAllApps(): void {
  appRegistry.clear();
  basebaseRegistry.clear();
}
