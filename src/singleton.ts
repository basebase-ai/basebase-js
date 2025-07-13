/**
 * BaseBase Singleton Auto-Initializing Instance
 * Provides a ready-to-use basebase instance for frontend-only apps
 */

import { Basebase, BasebaseConfig } from "./types";
import { initializeApp, getBasebase } from "./app";
import { isBrowser } from "./utils";
import { getToken, getProject, setDirectToken } from "./auth";

// ========================================
// Environment Configuration Reading
// ========================================

/**
 * Reads configuration from environment variables
 */
function getEnvironmentConfig(): BasebaseConfig | null {
  let config: Partial<BasebaseConfig> = {};

  // Try to read from browser environment (e.g., Vite, Webpack)
  if (isBrowser()) {
    // Check for environment variables in browser (usually prefixed)
    const env = (globalThis as any).process?.env || {};
    const importMeta = (globalThis as any).import?.meta?.env || {};

    // Try various common environment variable patterns
    config.apiKey =
      env.BASEBASE_API_KEY ||
      env.VITE_BASEBASE_API_KEY ||
      env.REACT_APP_BASEBASE_API_KEY ||
      importMeta.BASEBASE_API_KEY ||
      importMeta.VITE_BASEBASE_API_KEY ||
      importMeta.REACT_APP_BASEBASE_API_KEY;

    config.projectId =
      env.BASEBASE_PROJECT_ID ||
      env.VITE_BASEBASE_PROJECT_ID ||
      env.REACT_APP_BASEBASE_PROJECT_ID ||
      importMeta.BASEBASE_PROJECT_ID ||
      importMeta.VITE_BASEBASE_PROJECT_ID ||
      importMeta.REACT_APP_BASEBASE_PROJECT_ID;

    config.baseUrl =
      env.BASEBASE_BASE_URL ||
      env.VITE_BASEBASE_BASE_URL ||
      env.REACT_APP_BASEBASE_BASE_URL ||
      importMeta.BASEBASE_BASE_URL ||
      importMeta.VITE_BASEBASE_BASE_URL ||
      importMeta.REACT_APP_BASEBASE_BASE_URL;

    config.token =
      env.BASEBASE_TOKEN ||
      env.VITE_BASEBASE_TOKEN ||
      env.REACT_APP_BASEBASE_TOKEN ||
      importMeta.BASEBASE_TOKEN ||
      importMeta.VITE_BASEBASE_TOKEN ||
      importMeta.REACT_APP_BASEBASE_TOKEN;
  } else {
    // Node.js environment
    try {
      const processEnv = (globalThis as any).process?.env;
      if (processEnv) {
        config.apiKey = processEnv.BASEBASE_API_KEY;
        config.projectId = processEnv.BASEBASE_PROJECT_ID;
        config.baseUrl = processEnv.BASEBASE_BASE_URL;
        config.token = processEnv.BASEBASE_TOKEN;
      }
    } catch {
      // Ignore if process is not available
    }
  }

  // Return null if no API key found
  if (!config.apiKey) {
    return null;
  }

  return config as BasebaseConfig;
}

// ========================================
// Singleton Instance Management
// ========================================

let singletonInstance: Basebase | null = null;
let initializationError: Error | null = null;

/**
 * Gets the singleton basebase instance, creating it if needed
 */
export function getSingletonBasebase(): Basebase {
  if (singletonInstance) {
    return singletonInstance;
  }

  if (initializationError) {
    throw initializationError;
  }

  try {
    // First try to get config from environment variables
    let config = getEnvironmentConfig();

    // If no environment config, check if we have a stored authentication token
    if (!config) {
      const storedToken = getToken();

      if (storedToken) {
        // We have a stored token from authentication, create minimal config
        const storedProject = getProject();
        config = {
          apiKey: "authenticated", // Dummy API key since we have a token
          projectId: storedProject?.name,
          token: storedToken,
        };
      }
    }

    if (!config) {
      if (!isBrowser()) {
        throw new Error(
          "BaseBase configuration required for server environments. " +
            "Please use configureSingletonBasebase({ token: 'jwt_token', projectId: 'project_name' })."
        );
      } else {
        throw new Error(
          "BaseBase not configured. Please authenticate first using verifyCode(), " +
            "or set BASEBASE_API_KEY environment variable."
        );
      }
    }

    const app = initializeApp(config, "[SINGLETON]");
    singletonInstance = getBasebase(app);
    return singletonInstance;
  } catch (error) {
    initializationError = error as Error;
    throw error;
  }
}

/**
 * Manually configure the singleton basebase instance
 * For server environments, both token and projectId are required
 */
export function configureSingletonBasebase(config: BasebaseConfig): Basebase {
  // In non-browser environments, require both token and projectId
  if (!isBrowser()) {
    if (!config.token) {
      throw new Error(
        "JWT token is required for server environments. " +
          "Please provide config.token in configureSingletonBasebase()."
      );
    }
    if (!config.projectId) {
      throw new Error(
        "Project ID is required for server environments. " +
          "Please provide config.projectId in configureSingletonBasebase()."
      );
    }
  }

  try {
    const app = initializeApp(config, "[SINGLETON]");
    singletonInstance = getBasebase(app);
    initializationError = null;

    // Store token and project info for server environments
    if (!isBrowser() && config.token) {
      setDirectToken(config.token);
    }

    return singletonInstance;
  } catch (error) {
    initializationError = error as Error;
    throw error;
  }
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetSingletonBasebase(): void {
  singletonInstance = null;
  initializationError = null;
}

/**
 * Check if singleton instance is configured
 */
export function isSingletonConfigured(): boolean {
  return singletonInstance !== null;
}

// ========================================
// Ready-to-use Basebase Instance Export
// ========================================

/**
 * Ready-to-use basebase instance that auto-initializes from environment variables
 *
 * @example
 * ```typescript
 * import { basebase } from 'basebase-js';
 *
 * // No initialization needed - just start using it!
 * const userRef = doc(basebase, 'users/user123');
 * const userSnap = await getDoc(userRef);
 * ```
 */
export const basebase = new Proxy({} as Basebase, {
  get(target, prop) {
    const instance = getSingletonBasebase();
    return instance[prop as keyof Basebase];
  },
  set(target, prop, value) {
    const instance = getSingletonBasebase();
    (instance as any)[prop] = value;
    return true;
  },
  ownKeys(target) {
    const instance = getSingletonBasebase();
    return Reflect.ownKeys(instance);
  },
  has(target, prop) {
    const instance = getSingletonBasebase();
    return prop in instance;
  },
  getOwnPropertyDescriptor(target, prop) {
    const instance = getSingletonBasebase();
    return Reflect.getOwnPropertyDescriptor(instance, prop);
  },
});
