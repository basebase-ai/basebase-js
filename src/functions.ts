/**
 * BaseBase Functions Module
 * Handles calling server-side functions with BaseBase
 */

import {
  Basebase,
  FunctionCallRequest,
  FunctionCallResponse,
  BasebaseError,
  BASEBASE_ERROR_CODES,
} from "./types";
import { makeHttpRequest, buildFunctionCallPath } from "./utils";
import { getToken, getAuthState } from "./auth";

/**
 * Calls a server-side function with parameters
 *
 * @param functionName - The name of the function to call
 * @param parameters - Object containing function parameters
 * @param basebaseInstance - Optional BaseBase instance. If not provided, uses default authentication
 * @returns Promise resolving to the function result
 *
 * @example
 * ```typescript
 * // Using with authentication
 * const result = await callFunction('getPage', {
 *   url: 'https://example.com',
 *   selector: 'h1'
 * });
 *
 * // Using with custom BaseBase instance
 * const db = getDatabase('your_jwt_token');
 * const result = await callFunction('processData', { data: 'test' }, db);
 * ```
 */
export async function callFunction(
  functionName: string,
  parameters: FunctionCallRequest = {},
  basebaseInstance?: Basebase
): Promise<any> {
  if (!functionName || typeof functionName !== "string") {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Function name must be a non-empty string"
    );
  }

  if (typeof parameters !== "object" || parameters === null) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Parameters must be an object"
    );
  }

  // Get authentication token and project ID
  let token: string;
  let baseUrl: string;
  let projectId: string;

  if (basebaseInstance) {
    // Use provided instance
    token = basebaseInstance.app.options.token || "";
    baseUrl = basebaseInstance.baseUrl;
    projectId = basebaseInstance.projectId;
  } else {
    // Use default authentication
    const authToken = getToken();
    if (!authToken) {
      throw new BasebaseError(
        BASEBASE_ERROR_CODES.UNAUTHENTICATED,
        "No authentication token available. Please authenticate first or provide a BaseBase instance."
      );
    }
    token = authToken;

    // Get the base URL that was used for authentication
    // Check for custom base URL from browser environment
    if (typeof window !== "undefined" && (window as any).customBaseUrl) {
      baseUrl = (window as any).customBaseUrl;
    } else {
      baseUrl = "https://api.basebase.us"; // Default base URL
    }

    // Get project ID from auth state
    const authState = getAuthState();
    if (!authState.project?.id) {
      throw new BasebaseError(
        BASEBASE_ERROR_CODES.UNAUTHENTICATED,
        "No project ID available. Please authenticate first."
      );
    }
    projectId = authState.project.id;
  }

  // Build the function call URL
  const url = buildFunctionCallPath(baseUrl, projectId, functionName);

  try {
    const response = await makeHttpRequest<FunctionCallResponse>(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: {
        data: parameters,
      },
    });

    // If there's an error in the response, throw it
    if (response.error) {
      throw new BasebaseError(
        BASEBASE_ERROR_CODES.INTERNAL,
        response.error + (response.details ? `: ${response.details}` : "")
      );
    }

    // Return the result
    return response.result;
  } catch (error) {
    // Re-throw BasebaseError as-is
    if (error instanceof BasebaseError) {
      throw error;
    }

    // Wrap other errors
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INTERNAL,
      `Function call failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
