/**
 * BaseBase Functions Module
 * Handles calling server-side functions and function management with BaseBase
 */

import {
  Basebase,
  FunctionCallRequest,
  FunctionCallResponse,
  CloudFunction,
  CreateFunctionRequest,
  UpdateFunctionRequest,
  FunctionListResponse,
  ScheduledFunction,
  CreateScheduleRequest,
  UpdateScheduleRequest,
  ScheduleListResponse,
  BasebaseError,
  BASEBASE_ERROR_CODES,
} from "./types";
import { makeHttpRequest, buildFunctionCallPath } from "./utils";
import { getToken, getAuthState } from "./auth";

// ========================================
// Function Calling (Existing)
// ========================================

/**
 * Calls a server-side function with parameters
 * Supports calling functions from different projects using project/function syntax
 *
 * @param functionName - The name of the function to call, optionally fully qualified (e.g., "basebase/getPage")
 * @param parameters - Object containing function parameters
 * @param basebaseInstance - Optional BaseBase instance. If not provided, uses default authentication
 * @returns Promise resolving to the function result
 *
 * @example
 * ```typescript
 * // Call function from your project
 * const result = await callFunction('myFunction', { param: 'value' });
 *
 * // Call system function from basebase project
 * const page = await callFunction('basebase/getPage', {
 *   url: 'https://example.com',
 *   selector: 'h1'
 * });
 *
 * // Call function from specific project
 * const result = await callFunction('test_project/helloWorld', { name: 'World' });
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

  // Parse function name for project prefix (e.g., "basebase/getPage")
  let targetProjectId: string;
  let actualFunctionName: string;

  if (functionName.includes("/")) {
    const parts = functionName.split("/");
    if (parts.length !== 2) {
      throw new BasebaseError(
        BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
        "Function name must be either 'functionName' or 'projectId/functionName'"
      );
    }
    targetProjectId = parts[0]!; // Safe because we validated length === 2
    actualFunctionName = parts[1]!; // Safe because we validated length === 2
  } else {
    // No prefix - use authenticated user's project
    actualFunctionName = functionName;
    targetProjectId = "";
  }

  // Get authentication token and project ID
  let token: string;
  let baseUrl: string;
  let projectId: string;

  if (basebaseInstance) {
    // Use provided instance
    token = basebaseInstance.app.options.token || "";
    baseUrl = basebaseInstance.baseUrl;
    projectId = targetProjectId || basebaseInstance.projectId;
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

    // Get project ID from auth state or use specified project
    if (targetProjectId) {
      projectId = targetProjectId;
    } else {
      const authState = getAuthState();
      if (!authState.project?.id) {
        throw new BasebaseError(
          BASEBASE_ERROR_CODES.UNAUTHENTICATED,
          "No project ID available. Please authenticate first."
        );
      }
      projectId = authState.project.id;
    }
  }

  // Build the function call URL
  const url = buildFunctionCallPath(baseUrl, projectId, actualFunctionName);

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

// ========================================
// Function Management (CRUD)
// ========================================

/**
 * Creates a new cloud function
 *
 * @param functionData - Function configuration with user-friendly field names
 * @param basebaseInstance - Optional BaseBase instance
 * @returns Promise resolving to the created function
 *
 * @example
 * ```typescript
 * const func = await createFunction({
 *   name: 'myFunction',
 *   code: 'exports.handler = async (data) => { return { message: "Hello!" }; }',
 *   description: 'My custom function'
 * });
 * ```
 */
export async function createFunction(
  functionData: {
    name: string;
    code: string;
    description?: string;
    timeout?: number;
    memoryMB?: number;
    runtime?: string;
    environmentVariables?: Record<string, string>;
  },
  basebaseInstance?: Basebase
): Promise<CloudFunction> {
  const { token, baseUrl, projectId } = await getAuthContext(basebaseInstance);

  const url = `${baseUrl}/v1/projects/${projectId}/functions`;

  // Map user-friendly field names to server-expected field names
  const serverFunctionData: CreateFunctionRequest = {
    id: functionData.name,
    implementationCode: functionData.code,
    description: functionData.description || "A BaseBase function", // Provide default if not specified
    timeout: functionData.timeout,
    memoryMB: functionData.memoryMB,
    runtime: functionData.runtime,
    environmentVariables: functionData.environmentVariables,
  };

  const response = await makeHttpRequest<CloudFunction>(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: serverFunctionData,
  });

  return response;
}

/**
 * Retrieves a cloud function by name
 *
 * @param functionName - Name of the function to retrieve
 * @param basebaseInstance - Optional BaseBase instance
 * @returns Promise resolving to the function details
 *
 * @example
 * ```typescript
 * const func = await getFunction('myFunction');
 * console.log(func.code);
 * ```
 */
export async function getFunction(
  functionName: string,
  basebaseInstance?: Basebase
): Promise<CloudFunction> {
  const { token, baseUrl, projectId } = await getAuthContext(basebaseInstance);

  const url = `${baseUrl}/v1/projects/${projectId}/functions/${functionName}`;

  const response = await makeHttpRequest<CloudFunction>(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response;
}

/**
 * Lists all cloud functions in the project
 *
 * @param basebaseInstance - Optional BaseBase instance
 * @returns Promise resolving to the list of functions
 *
 * @example
 * ```typescript
 * const functions = await listFunctions();
 * functions.forEach(func => console.log(func.name));
 * ```
 */
export async function listFunctions(
  basebaseInstance?: Basebase
): Promise<CloudFunction[]> {
  const { token, baseUrl, projectId } = await getAuthContext(basebaseInstance);

  const url = `${baseUrl}/v1/projects/${projectId}/functions`;

  const response = await makeHttpRequest<FunctionListResponse>(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.functions;
}

/**
 * Updates an existing cloud function
 *
 * @param functionName - Name of the function to update
 * @param updates - Fields to update with user-friendly field names
 * @param basebaseInstance - Optional BaseBase instance
 * @returns Promise resolving to the updated function
 *
 * @example
 * ```typescript
 * const updatedFunc = await updateFunction('myFunction', {
 *   code: 'exports.handler = async (data) => { return { message: "Updated!" }; }',
 *   timeout: 60
 * });
 * ```
 */
export async function updateFunction(
  functionName: string,
  updates: {
    code?: string;
    description?: string;
    timeout?: number;
    memoryMB?: number;
    runtime?: string;
    environmentVariables?: Record<string, string>;
  },
  basebaseInstance?: Basebase
): Promise<CloudFunction> {
  const { token, baseUrl, projectId } = await getAuthContext(basebaseInstance);

  const url = `${baseUrl}/v1/projects/${projectId}/functions/${functionName}`;

  // Map user-friendly field names to server-expected field names
  const serverUpdates: UpdateFunctionRequest = {};
  if (updates.code !== undefined)
    serverUpdates.implementationCode = updates.code;
  if (updates.description !== undefined)
    serverUpdates.description = updates.description;
  if (updates.timeout !== undefined) serverUpdates.timeout = updates.timeout;
  if (updates.memoryMB !== undefined) serverUpdates.memoryMB = updates.memoryMB;
  if (updates.runtime !== undefined) serverUpdates.runtime = updates.runtime;
  if (updates.environmentVariables !== undefined)
    serverUpdates.environmentVariables = updates.environmentVariables;

  const response = await makeHttpRequest<CloudFunction>(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: serverUpdates,
  });

  return response;
}

/**
 * Deletes a cloud function
 *
 * @param functionName - Name of the function to delete
 * @param basebaseInstance - Optional BaseBase instance
 * @returns Promise that resolves when deletion is complete
 *
 * @example
 * ```typescript
 * await deleteFunction('myFunction');
 * console.log('Function deleted successfully');
 * ```
 */
export async function deleteFunction(
  functionName: string,
  basebaseInstance?: Basebase
): Promise<void> {
  const { token, baseUrl, projectId } = await getAuthContext(basebaseInstance);

  const url = `${baseUrl}/v1/projects/${projectId}/functions/${functionName}`;

  await makeHttpRequest<void>(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// ========================================
// Function Scheduling
// ========================================

/**
 * Creates a scheduled function with cron syntax
 *
 * @param scheduleData - Schedule configuration
 * @param basebaseInstance - Optional BaseBase instance
 * @returns Promise resolving to the created schedule
 *
 * @example
 * ```typescript
 * const schedule = await createSchedule({
 *   name: 'dailyCleanup',
 *   functionName: 'cleanupFunction',
 *   schedule: '0 2 * * *', // Daily at 2 AM
 *   timeZone: 'America/New_York',
 *   data: { target: 'temp_files' }
 * });
 * ```
 */
export async function createSchedule(
  scheduleData: CreateScheduleRequest,
  basebaseInstance?: Basebase
): Promise<ScheduledFunction> {
  const { token, baseUrl, projectId } = await getAuthContext(basebaseInstance);

  const url = `${baseUrl}/v1/projects/${projectId}/schedules`;

  const response = await makeHttpRequest<ScheduledFunction>(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: scheduleData,
  });

  return response;
}

/**
 * Retrieves a scheduled function by name
 *
 * @param scheduleName - Name of the schedule to retrieve
 * @param basebaseInstance - Optional BaseBase instance
 * @returns Promise resolving to the schedule details
 *
 * @example
 * ```typescript
 * const schedule = await getSchedule('dailyCleanup');
 * console.log(`Next run: ${schedule.nextRun}`);
 * ```
 */
export async function getSchedule(
  scheduleName: string,
  basebaseInstance?: Basebase
): Promise<ScheduledFunction> {
  const { token, baseUrl, projectId } = await getAuthContext(basebaseInstance);

  const url = `${baseUrl}/v1/projects/${projectId}/schedules/${scheduleName}`;

  const response = await makeHttpRequest<ScheduledFunction>(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response;
}

/**
 * Lists all scheduled functions in the project
 *
 * @param basebaseInstance - Optional BaseBase instance
 * @returns Promise resolving to the list of schedules
 *
 * @example
 * ```typescript
 * const schedules = await listSchedules();
 * schedules.forEach(schedule => console.log(`${schedule.name}: ${schedule.schedule}`));
 * ```
 */
export async function listSchedules(
  basebaseInstance?: Basebase
): Promise<ScheduledFunction[]> {
  const { token, baseUrl, projectId } = await getAuthContext(basebaseInstance);

  const url = `${baseUrl}/v1/projects/${projectId}/schedules`;

  const response = await makeHttpRequest<ScheduleListResponse>(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.schedules;
}

/**
 * Updates an existing scheduled function
 *
 * @param scheduleName - Name of the schedule to update
 * @param updates - Schedule updates to apply
 * @param basebaseInstance - Optional BaseBase instance
 * @returns Promise resolving to the updated schedule
 *
 * @example
 * ```typescript
 * const updatedSchedule = await updateSchedule('dailyCleanup', {
 *   schedule: '0 3 * * *', // Change to 3 AM
 *   enabled: false
 * });
 * ```
 */
export async function updateSchedule(
  scheduleName: string,
  updates: UpdateScheduleRequest,
  basebaseInstance?: Basebase
): Promise<ScheduledFunction> {
  const { token, baseUrl, projectId } = await getAuthContext(basebaseInstance);

  const url = `${baseUrl}/v1/projects/${projectId}/schedules/${scheduleName}`;

  const response = await makeHttpRequest<ScheduledFunction>(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: updates,
  });

  return response;
}

/**
 * Deletes a scheduled function
 *
 * @param scheduleName - Name of the schedule to delete
 * @param basebaseInstance - Optional BaseBase instance
 * @returns Promise that resolves when deletion is complete
 *
 * @example
 * ```typescript
 * await deleteSchedule('dailyCleanup');
 * console.log('Schedule deleted successfully');
 * ```
 */
export async function deleteSchedule(
  scheduleName: string,
  basebaseInstance?: Basebase
): Promise<void> {
  const { token, baseUrl, projectId } = await getAuthContext(basebaseInstance);

  const url = `${baseUrl}/v1/projects/${projectId}/schedules/${scheduleName}`;

  await makeHttpRequest<void>(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// ========================================
// Utility Functions
// ========================================

/**
 * Helper function to get authentication context
 */
async function getAuthContext(basebaseInstance?: Basebase): Promise<{
  token: string;
  baseUrl: string;
  projectId: string;
}> {
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
    if (typeof window !== "undefined" && (window as any).customBaseUrl) {
      baseUrl = (window as any).customBaseUrl;
    } else {
      baseUrl = "https://api.basebase.us";
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

  return { token, baseUrl, projectId };
}
