/**
 * BaseBase Authentication Module
 * Handles phone verification and JWT token management
 */

import Cookies from "js-cookie";
import {
  RequestCodeRequest,
  RequestCodeResponse,
  VerifyCodeRequest,
  VerifyCodeResponse,
  RawVerifyCodeResponse,
  BasebaseUser,
  BasebaseProject,
  AuthState,
  BasebaseError,
  BASEBASE_ERROR_CODES,
  getGlobalBaseUrl,
  API_VERSION,
} from "./types";
import {
  makeHttpRequest,
  isBrowser,
  parseUserFromFields,
  parseProjectFromFields,
} from "./utils";

// ========================================
// Constants
// ========================================

const TOKEN_COOKIE_NAME = "basebase_token";
const TOKEN_STORAGE_KEY = "basebase_token";
const USER_STORAGE_KEY = "basebase_user";
const PROJECT_STORAGE_KEY = "basebase_project";
const TOKEN_EXPIRY_DAYS = 30;

// ========================================
// Global Token Storage for Server Environments
// ========================================

let directToken: string | null = null;

// ========================================
// Token Management
// ========================================

/**
 * Sets a JWT token directly for server environments (internal use only)
 */
export function setDirectToken(token: string): void {
  directToken = token;
}

/**
 * Gets the directly set token for server environments
 */
export function getDirectToken(): string | null {
  return directToken;
}

/**
 * Removes the directly set token for server environments
 */
export function removeDirectToken(): void {
  directToken = null;
}

/**
 * Sets the JWT token in both cookies and localStorage
 */
export function setToken(token: string): void {
  if (!isBrowser()) {
    // In server environments, store the token directly
    setDirectToken(token);
    return;
  }

  // Set in cookie
  try {
    Cookies.set(TOKEN_COOKIE_NAME, token, {
      expires: TOKEN_EXPIRY_DAYS,
      secure: window.location.protocol === "https:",
      sameSite: "lax",
    });
  } catch (error) {
    console.warn("Failed to set token cookie:", error);
  }

  // Set in localStorage as backup
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch (error) {
    console.warn("Failed to set token in localStorage:", error);
  }
}

/**
 * Gets the JWT token from cookies, localStorage, or directly set token
 */
export function getToken(): string | null {
  // Check for directly set token first (for server environments)
  if (directToken) {
    return directToken;
  }

  if (!isBrowser()) return null;

  // Try cookie first
  let token = Cookies.get(TOKEN_COOKIE_NAME);

  // Fallback to localStorage
  if (!token) {
    try {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      token = storedToken || undefined;
    } catch (error) {
      console.warn("Failed to get token from localStorage:", error);
    }
  }

  return token || null;
}

/**
 * Removes the JWT token from cookies, localStorage, and direct storage
 */
export function removeToken(): void {
  // Remove directly set token
  removeDirectToken();

  if (!isBrowser()) return;

  // Remove from cookie
  try {
    Cookies.remove(TOKEN_COOKIE_NAME);
  } catch (error) {
    console.warn("Failed to remove token cookie:", error);
  }

  // Remove from localStorage
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(PROJECT_STORAGE_KEY);
  } catch (error) {
    console.warn("Failed to remove token from localStorage:", error);
  }
}

/**
 * Sets user data in localStorage
 */
export function setUser(user: BasebaseUser): void {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch (error) {
    console.warn("Failed to set user in localStorage:", error);
  }
}

/**
 * Gets user data from localStorage
 */
export function getUser(): BasebaseUser | null {
  if (!isBrowser()) return null;

  try {
    const userStr = localStorage.getItem(USER_STORAGE_KEY);
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.warn("Failed to get user from localStorage:", error);
    return null;
  }
}

/**
 * Sets project data in localStorage
 */
export function setProject(project: BasebaseProject): void {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
  } catch (error) {
    console.warn("Failed to set project in localStorage:", error);
  }
}

/**
 * Gets project data from localStorage
 */
export function getProject(): BasebaseProject | null {
  if (!isBrowser()) return null;

  try {
    const projectStr = localStorage.getItem(PROJECT_STORAGE_KEY);
    return projectStr ? JSON.parse(projectStr) : null;
  } catch (error) {
    console.warn("Failed to get project from localStorage:", error);
    return null;
  }
}

/**
 * Gets the current authentication state
 */
export function getAuthState(): AuthState {
  const token = getToken();
  const user = getUser();
  const project = getProject();

  return {
    token,
    user,
    project,
    isAuthenticated: !!(token && user && project),
  };
}

/**
 * Checks if the user is currently authenticated
 */
export function isAuthenticated(): boolean {
  return getAuthState().isAuthenticated;
}

// ========================================
// JWT Token Utilities
// ========================================

/**
 * Decodes a JWT token payload (without verification)
 */
export function decodeTokenPayload(token: string): any {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid token format");
    }

    const payload = parts[1];
    if (!payload) {
      throw new Error("Missing token payload");
    }

    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch (error) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Invalid JWT token format"
    );
  }
}

/**
 * Checks if a JWT token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const payload = decodeTokenPayload(token);
    if (!payload || !payload.exp) {
      return false; // No expiration claim
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch {
    return true; // Assume expired if we can't decode
  }
}

/**
 * Validates the current token and removes it if expired
 */
export function validateStoredToken(): boolean {
  const token = getToken();
  if (!token) {
    return false;
  }

  if (isTokenExpired(token)) {
    removeToken();
    return false;
  }

  return true;
}

// ========================================
// Authentication API Functions
// ========================================

/**
 * Requests a verification code to be sent to the phone number
 */
export async function requestCode(
  username: string,
  phone: string,
  baseUrl?: string
): Promise<RequestCodeResponse> {
  if (!username || !phone) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Username and phone number are required"
    );
  }

  // Validate username is alphanumeric with no spaces
  const usernameRegex = /^[a-zA-Z0-9]+$/;
  if (!usernameRegex.test(username.trim())) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Username must contain only alphanumeric characters with no spaces"
    );
  }

  const request: RequestCodeRequest = {
    username: username.trim(),
    phone: phone.trim(),
  };

  try {
    const effectiveBaseUrl = baseUrl || getGlobalBaseUrl();
    const requestUrl = `${effectiveBaseUrl}/${API_VERSION}/requestCode`;

    console.log("Sending requestCode request:", {
      url: requestUrl,
      request: request,
      username: username.trim(),
      phone: phone.trim(),
    });

    const response = await makeHttpRequest<RequestCodeResponse>(requestUrl, {
      method: "POST",
      body: request,
      timeout: 10000,
    });

    console.log("requestCode response:", response);
    return response;
  } catch (error) {
    console.error("requestCode error:", error);
    if (error instanceof BasebaseError) {
      throw error;
    }

    throw new BasebaseError(
      BASEBASE_ERROR_CODES.NETWORK_ERROR,
      `Failed to request verification code: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Verifies the code and returns JWT token and user data
 */
export async function verifyCode(
  phone: string,
  code: string,
  projectId: string,
  baseUrl?: string
): Promise<VerifyCodeResponse> {
  if (!phone || !code || !projectId) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Phone number, verification code, and project ID are required"
    );
  }

  const request: VerifyCodeRequest = {
    phone: phone.trim(),
    code: code.trim(),
    projectId: projectId.trim(),
  };

  try {
    const effectiveBaseUrl = baseUrl || getGlobalBaseUrl();
    const requestUrl = `${effectiveBaseUrl}/${API_VERSION}/verifyCode`;

    console.log("Sending verifyCode request:", {
      url: requestUrl,
      request: request,
      phone: phone.trim(),
      code: code.trim(),
      projectId: projectId.trim(),
    });

    const rawResponse = await makeHttpRequest<RawVerifyCodeResponse>(
      requestUrl,
      {
        method: "POST",
        body: request,
        timeout: 10000,
      }
    );

    console.log("verifyCode raw response:", rawResponse);

    // Parse the Firebase-like response format
    const parsedUser = parseUserFromFields(rawResponse.user);
    const parsedProject = parseProjectFromFields(rawResponse.project);

    const response: VerifyCodeResponse = {
      token: rawResponse.token,
      user: parsedUser,
      project: parsedProject,
    };

    console.log("verifyCode parsed response:", response);

    // Store the token, user data, and project information
    if (response.token && response.user && response.project) {
      setToken(response.token);
      setUser(response.user);
      setProject(response.project);
    }

    return response;
  } catch (error) {
    if (error instanceof BasebaseError) {
      throw error;
    }

    throw new BasebaseError(
      BASEBASE_ERROR_CODES.NETWORK_ERROR,
      `Failed to verify code: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Signs out the current user by removing stored credentials
 */
export function signOut(): void {
  removeToken();
}

/**
 * Gets the Authorization header for API requests
 */
export function getAuthHeader(): Record<string, string> {
  const token = getToken();
  if (!token) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.UNAUTHENTICATED,
      "No authentication token found. Please sign in first."
    );
  }

  if (isTokenExpired(token)) {
    removeToken();
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.UNAUTHENTICATED,
      "Authentication token has expired. Please sign in again."
    );
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

// ========================================
// Authentication State Management
// ========================================

type AuthStateListener = (authState: AuthState) => void;
const authListeners: Set<AuthStateListener> = new Set();

/**
 * Adds a listener for authentication state changes
 */
export function onAuthStateChanged(listener: AuthStateListener): () => void {
  authListeners.add(listener);

  // Call immediately with current state
  listener(getAuthState());

  // Return unsubscribe function
  return () => {
    authListeners.delete(listener);
  };
}

/**
 * Notifies all listeners of authentication state changes
 */
function notifyAuthStateChanged(): void {
  const authState = getAuthState();
  authListeners.forEach((listener) => {
    try {
      listener(authState);
    } catch (error) {
      console.warn("Error in auth state listener:", error);
    }
  });
}

// Listen for storage events to sync auth state across tabs
if (isBrowser()) {
  window.addEventListener("storage", (event) => {
    if (event.key === TOKEN_STORAGE_KEY || event.key === USER_STORAGE_KEY) {
      notifyAuthStateChanged();
    }
  });
}

// ========================================
// Export everything for the main module
// ========================================

export { TOKEN_COOKIE_NAME, TOKEN_STORAGE_KEY, USER_STORAGE_KEY };
