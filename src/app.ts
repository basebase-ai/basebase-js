/**
 * BaseBase App Initialization Module
 * Handles app creation and BaseBase instance management
 */

import {
  BasebaseConfig,
  BasebaseApp,
  Basebase,
  BasebaseError,
  BASEBASE_ERROR_CODES,
  DEFAULT_BASE_URL,
} from "./types";
import { validateStoredToken, getProject } from "./auth";
import { getProjectIdFromApiKey } from "./utils";

// ========================================
// App Registry
// ========================================

const appRegistry = new Map<string, BasebaseApp>();
const basebaseRegistry = new Map<string, Basebase>();

// ========================================
// App Management Functions
// ========================================

/**
 * Initializes a BaseBase app with the given configuration
 */
export function initializeApp(
  config: BasebaseConfig,
  name: string = "[DEFAULT]"
): BasebaseApp {
  // Validate configuration
  if (!config) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "BaseBase configuration is required"
    );
  }

  if (!config.apiKey) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "API key is required in BaseBase configuration"
    );
  }

  // Validate API key format
  if (typeof config.apiKey !== "string" || config.apiKey.trim() === "") {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "API key must be a non-empty string"
    );
  }

  // Get project ID from stored authentication data first, then fall back to config or API key
  const storedProject = getProject();
  const projectId =
    storedProject?.name ||
    config.projectId ||
    getProjectIdFromApiKey(config.apiKey);

  // Check if app already exists
  if (appRegistry.has(name)) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.ALREADY_EXISTS,
      `BaseBase app named "${name}" already exists`
    );
  }

  // Create normalized configuration
  const normalizedConfig: BasebaseConfig = {
    projectId: projectId,
    apiKey: config.apiKey.trim(),
    baseUrl: config.baseUrl?.trim() || DEFAULT_BASE_URL,
  };

  // Create app instance
  const app: BasebaseApp = {
    name,
    options: normalizedConfig,
  };

  // Register the app
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
    // Remove from registries
    appRegistry.delete(app.name);
    basebaseRegistry.delete(app.name);

    resolve();
  });
}

// ========================================
// BaseBase Instance Management
// ========================================

/**
 * Gets a BaseBase instance for the given app
 */
export function getBasebase(app?: BasebaseApp): Basebase {
  // Use default app if none provided
  if (!app) {
    app = getApp();
  }

  // Check if Basebase instance already exists
  let basebase = basebaseRegistry.get(app.name);

  if (!basebase) {
    // Create new Basebase instance
    basebase = createBasebaseInstance(app);
    basebaseRegistry.set(app.name, basebase);
  }

  return basebase;
}

/**
 * Creates a new BaseBase instance from an app
 */
function createBasebaseInstance(app: BasebaseApp): Basebase {
  // Validate stored authentication token
  validateStoredToken();

  // Get project ID from stored authentication data first, then fall back to config or API key
  const storedProject = getProject();
  const projectId =
    storedProject?.name ||
    app.options.projectId ||
    getProjectIdFromApiKey(app.options.apiKey);

  return {
    app,
    projectId: projectId,
    apiKey: app.options.apiKey,
    baseUrl: app.options.baseUrl || DEFAULT_BASE_URL,
  };
}

// ========================================
// Configuration Validation Utilities
// ========================================

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

  const requiredFields = ["apiKey"];
  const missingFields = requiredFields.filter(
    (field) => !config[field as keyof BasebaseConfig]
  );

  if (missingFields.length > 0) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      `Missing required configuration fields: ${missingFields.join(", ")}`
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

  // Validate project ID format if provided (similar to Firebase project IDs)
  if (config.projectId) {
    const projectIdRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
    if (config.projectId.length < 3 || config.projectId.length > 30) {
      throw new BasebaseError(
        BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
        "Project ID must be between 3 and 30 characters"
      );
    }

    if (!projectIdRegex.test(config.projectId)) {
      throw new BasebaseError(
        BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
        "Project ID must contain only lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen"
      );
    }
  }

  // Validate API key format (BaseBase API keys start with 'bb_')
  if (!config.apiKey.startsWith("bb_")) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      'Invalid API key format. BaseBase API keys must start with "bb_"'
    );
  }

  if (config.apiKey.length < 10) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "API key appears to be too short"
    );
  }
}

// ========================================
// Convenience Functions
// ========================================

/**
 * Initializes app and returns BaseBase instance in one call
 */
export function initializeBasebase(
  config: BasebaseConfig,
  name?: string
): Basebase {
  validateConfig(config);
  const app = initializeApp(config, name);
  return getBasebase(app);
}

/**
 * Gets the default BaseBase instance
 */
export function getDefaultBasebase(): Basebase {
  return getBasebase();
}

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
  return { ...app.options }; // Return a copy to prevent mutation
}

// ========================================
// Environment Detection
// ========================================

/**
 * Detects if we're running in a development environment
 */
export function isDevelopment(): boolean {
  // Check Node.js environment
  try {
    const processEnv = (globalThis as any).process?.env;
    if (processEnv && processEnv.NODE_ENV === "development") {
      return true;
    }
  } catch {
    // Ignore if process is not available
  }

  // Check browser environment
  if (typeof window !== "undefined") {
    return (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.startsWith("192.168.")
    );
  }

  return false;
}

/**
 * Gets the appropriate base URL based on environment
 */
export function getEnvironmentBaseUrl(): string {
  if (isDevelopment()) {
    return "https://app.basebase.us";
  }

  return DEFAULT_BASE_URL;
}

// ========================================
// Error Recovery and Health Check
// ========================================

/**
 * Performs a health check on the BaseBase service
 */
export async function healthCheck(baseUrl?: string): Promise<boolean> {
  const url = baseUrl || DEFAULT_BASE_URL;

  try {
    const response = await fetch(`${url}/health`, {
      method: "GET",
      timeout: 5000,
    } as RequestInit);

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Clears all app registrations (useful for testing)
 */
export function clearAllApps(): void {
  appRegistry.clear();
  basebaseRegistry.clear();
}
