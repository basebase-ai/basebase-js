/**
 * BaseBase Authentication Module
 * Handles phone verification and JWT token management
 */

import * as Cookies from "js-cookie";
import {
  RequestCodeRequest,
  RequestCodeResponse,
  VerifyCodeRequest,
  VerifyCodeResponse,
  BasebaseUser,
  AuthState,
  BasebaseError,
  BASEBASE_ERROR_CODES,
  DEFAULT_BASE_URL,
} from "./types";
import { makeHttpRequest, isBrowser } from "./utils";

// ========================================
// Constants
// ========================================

const TOKEN_COOKIE_NAME = "basebase_token";
const TOKEN_STORAGE_KEY = "basebase_token";
const USER_STORAGE_KEY = "basebase_user";
const TOKEN_EXPIRY_DAYS = 30;

// ========================================
// Token Management
// ========================================

/**
 * Sets the JWT token in both cookies and localStorage
 */
export function setToken(token: string): void {
  if (!isBrowser()) return;

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
 * Gets the JWT token from cookies or localStorage
 */
export function getToken(): string | null {
  if (!isBrowser()) return null;

  // Try cookie first
  let token = Cookies.get(TOKEN_COOKIE_NAME);

  // Fallback to localStorage
  if (!token) {
    try {
      token = localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch (error) {
      console.warn("Failed to get token from localStorage:", error);
    }
  }

  return token || null;
}

/**
 * Removes the JWT token from both cookies and localStorage
 */
export function removeToken(): void {
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
 * Gets the current authentication state
 */
export function getAuthState(): AuthState {
  const token = getToken();
  const user = getUser();

  return {
    token,
    user,
    isAuthenticated: !!(token && user),
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
  baseUrl: string = DEFAULT_BASE_URL
): Promise<RequestCodeResponse> {
  if (!username || !phone) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Username and phone number are required"
    );
  }

  const request: RequestCodeRequest = {
    username: username.trim(),
    phone: phone.trim(),
  };

  try {
    const response = await makeHttpRequest<RequestCodeResponse>(
      `${baseUrl}/requestCode`,
      {
        method: "POST",
        body: request,
        timeout: 10000,
      }
    );

    return response;
  } catch (error) {
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
  projectApiKey: string,
  baseUrl: string = DEFAULT_BASE_URL
): Promise<VerifyCodeResponse> {
  if (!phone || !code || !projectApiKey) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Phone number, verification code, and project API key are required"
    );
  }

  const request: VerifyCodeRequest = {
    phone: phone.trim(),
    code: code.trim(),
    projectApiKey: projectApiKey.trim(),
  };

  try {
    const response = await makeHttpRequest<VerifyCodeResponse>(
      `${baseUrl}/verifyCode`,
      {
        method: "POST",
        body: request,
        timeout: 10000,
      }
    );

    // Store the token and user data
    if (response.token && response.user) {
      setToken(response.token);
      setUser(response.user);
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
