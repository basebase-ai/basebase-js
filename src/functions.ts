/**
 * BaseBase Tasks Module
 * Handles calling server-side tasks and task management with BaseBase
 */

import {
  Basebase,
  TaskExecutionRequest,
  TaskExecutionResponse,
  CloudTask,
  SetTaskRequest,
  UpdateTaskRequest,
  TaskListResponse,
  TriggeredTask,
  CreateTriggerRequest,
  UpdateTriggerRequest,
  TriggerListResponse,
  BasebaseError,
  BASEBASE_ERROR_CODES,
} from "./types";
import { makeHttpRequest, buildTaskDoPath } from "./utils";
import { getToken, getAuthState } from "./auth";

// ========================================
// Task Execution
// ========================================

/**
 * Executes a server-side task with parameters
 * Supports executing tasks from different projects using project/task syntax
 *
 * @param taskName - The name of the task to execute, optionally fully qualified (e.g., "basebase/getPage")
 * @param parameters - Object containing task parameters
 * @param basebaseInstance - Optional BaseBase instance. If not provided, uses default authentication
 * @returns Promise resolving to the task result
 *
 * @example
 * ```typescript
 * // Execute task from your project
 * const result = await doTask('myTask', { param: 'value' });
 *
 * // Execute system task from basebase project
 * const page = await doTask('basebase/getPage', {
 *   url: 'https://example.com',
 *   selector: 'h1'
 * });
 *
 * // Execute task from specific project
 * const result = await doTask('test_project/helloWorld', { name: 'World' });
 *
 * // Using with custom BaseBase instance
 * const db = getDatabase('your_jwt_token');
 * const result = await doTask('processData', { data: 'test' }, db);
 * ```
 */
export async function doTask(
  taskName: string,
  parameters: TaskExecutionRequest = {},
  basebaseInstance?: Basebase
): Promise<any> {
  if (!taskName || typeof taskName !== "string") {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Task name must be a non-empty string"
    );
  }

  if (typeof parameters !== "object" || parameters === null) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Parameters must be an object"
    );
  }

  // Parse task name for project prefix (e.g., "basebase/getPage")
  let targetProjectId: string;
  let actualTaskName: string;

  if (taskName.includes("/")) {
    const parts = taskName.split("/");
    if (parts.length !== 2) {
      throw new BasebaseError(
        BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
        "Task name must be either 'taskName' or 'projectId/taskName'"
      );
    }
    targetProjectId = parts[0]!; // Safe because we validated length === 2
    actualTaskName = parts[1]!; // Safe because we validated length === 2
  } else {
    // No prefix - use authenticated user's project
    actualTaskName = taskName;
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

  // Build the task execution URL
  const url = buildTaskDoPath(baseUrl, projectId, actualTaskName);

  try {
    const response = await makeHttpRequest<TaskExecutionResponse>(url, {
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
      `Task execution failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// ========================================
// Task Management (CRUD)
// ========================================

/**
 * Sets a new cloud task with a specific name
 *
 * @param taskData - Task configuration with user-friendly field names
 * @param basebaseInstance - Optional BaseBase instance
 * @returns Promise resolving to the created task
 *
 * @example
 * ```typescript
 * const task = await setTask({
 *   name: 'myTask',
 *   code: 'exports.handler = async (data) => { return { message: "Hello!" }; }',
 *   description: 'My custom task'
 * });
 * ```
 */
export async function setTask(
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
): Promise<CloudTask> {
  const { token, baseUrl, projectId } = await getAuthContext(basebaseInstance);

  const url = `${baseUrl}/v1/projects/${projectId}/tasks`;

  // Map user-friendly field names to server-expected field names
  const serverTaskData: SetTaskRequest = {
    id: functionData.name,
    implementationCode: functionData.code,
    description: functionData.description || "A BaseBase task", // Provide default if not specified
    timeout: functionData.timeout,
    memoryMB: functionData.memoryMB,
    runtime: functionData.runtime,
    environmentVariables: functionData.environmentVariables,
  };

  const response = await makeHttpRequest<CloudTask>(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: serverTaskData,
  });

  return response;
}

/**
 * Retrieves a cloud task by name
 *
 * @param taskName - Name of the task to retrieve
 * @param basebaseInstance - Optional BaseBase instance
 * @returns Promise resolving to the task details
 *
 * @example
 * ```typescript
 * const task = await getTask('myTask');
 * console.log(task.code);
 * ```
 */
export async function getTask(
  taskName: string,
  basebaseInstance?: Basebase
): Promise<CloudTask> {
  const { token, baseUrl, projectId } = await getAuthContext(basebaseInstance);

  const url = `${baseUrl}/v1/projects/${projectId}/tasks/${taskName}`;

  const response = await makeHttpRequest<CloudTask>(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response;
}

/**
 * Lists all cloud tasks in the project
 *
 * @param basebaseInstance - Optional BaseBase instance
 * @returns Promise resolving to the list of tasks
 *
 * @example
 * ```typescript
 * const tasks = await listTasks();
 * tasks.forEach(task => console.log(task.name));
 * ```
 */
export async function listTasks(
  basebaseInstance?: Basebase
): Promise<CloudTask[]> {
  const { token, baseUrl, projectId } = await getAuthContext(basebaseInstance);

  const url = `${baseUrl}/v1/projects/${projectId}/tasks`;

  const response = await makeHttpRequest<TaskListResponse>(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.tasks;
}

/**
 * Updates an existing cloud task
 *
 * @param taskName - Name of the task to update
 * @param updates - Fields to update with user-friendly field names
 * @param basebaseInstance - Optional BaseBase instance
 * @returns Promise resolving to the updated task
 *
 * @example
 * ```typescript
 * const updatedTask = await updateTask('myTask', {
 *   code: 'exports.handler = async (data) => { return { message: "Updated!" }; }',
 *   timeout: 60
 * });
 * ```
 */
export async function updateTask(
  taskName: string,
  updates: {
    code?: string;
    description?: string;
    timeout?: number;
    memoryMB?: number;
    runtime?: string;
    environmentVariables?: Record<string, string>;
  },
  basebaseInstance?: Basebase
): Promise<CloudTask> {
  const { token, baseUrl, projectId } = await getAuthContext(basebaseInstance);

  const url = `${baseUrl}/v1/projects/${projectId}/tasks/${taskName}`;

  // Map user-friendly field names to server-expected field names
  const serverUpdates: UpdateTaskRequest = {};
  if (updates.code !== undefined)
    serverUpdates.implementationCode = updates.code;
  if (updates.description !== undefined)
    serverUpdates.description = updates.description;
  if (updates.timeout !== undefined) serverUpdates.timeout = updates.timeout;
  if (updates.memoryMB !== undefined) serverUpdates.memoryMB = updates.memoryMB;
  if (updates.runtime !== undefined) serverUpdates.runtime = updates.runtime;
  if (updates.environmentVariables !== undefined)
    serverUpdates.environmentVariables = updates.environmentVariables;

  const response = await makeHttpRequest<CloudTask>(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: serverUpdates,
  });

  return response;
}

/**
 * Deletes a cloud task
 *
 * @param taskName - Name of the task to delete
 * @param basebaseInstance - Optional BaseBase instance
 * @returns Promise that resolves when deletion is complete
 *
 * @example
 * ```typescript
 * await deleteTask('myTask');
 * console.log('Task deleted successfully');
 * ```
 */
export async function deleteTask(
  taskName: string,
  basebaseInstance?: Basebase
): Promise<void> {
  const { token, baseUrl, projectId } = await getAuthContext(basebaseInstance);

  const url = `${baseUrl}/v1/projects/${projectId}/tasks/${taskName}`;

  await makeHttpRequest<void>(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// ========================================
// Task Triggering
// ========================================

/**
 * Adds a triggered task with cron syntax (server assigns ID)
 *
 * @param triggerData - Trigger configuration
 * @param basebaseInstance - Optional BaseBase instance
 * @returns Promise resolving to the created trigger
 *
 * @example
 * ```typescript
 * const trigger = await addTrigger({
 *   name: 'dailyCleanup',
 *   taskName: 'cleanupTask',
 *   schedule: '0 2 * * *', // Daily at 2 AM
 *   timeZone: 'America/New_York',
 *   data: { target: 'temp_files' }
 * });
 * ```
 */
export async function addTrigger(
  triggerData: CreateTriggerRequest,
  basebaseInstance?: Basebase
): Promise<TriggeredTask> {
  const { token, baseUrl, projectId } = await getAuthContext(basebaseInstance);

  const url = `${baseUrl}/v1/projects/${projectId}/triggers`;

  // Map user-friendly field names to server-expected structure
  const serverTriggerData = {
    taskId: triggerData.taskName,
    triggerType: "cron",
    config: {
      schedule: triggerData.schedule,
      timezone: triggerData.timeZone || "UTC",
    },
    enabled: triggerData.enabled !== undefined ? triggerData.enabled : true,
    ...(triggerData.name && { description: triggerData.name }),
    ...(triggerData.data && { taskParams: triggerData.data }),
  };

  const response = await makeHttpRequest<TriggeredTask>(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: serverTriggerData,
  });

  return response;
}

/**
 * Sets a triggered task with a custom ID using cron syntax
 *
 * @param triggerId - Custom ID for the trigger
 * @param triggerData - Trigger configuration
 * @param basebaseInstance - Optional BaseBase instance
 * @returns Promise resolving to the created trigger
 *
 * @example
 * ```typescript
 * const trigger = await setTrigger('my-daily-cleanup', {
 *   name: 'dailyCleanup',
 *   taskName: 'cleanupTask',
 *   schedule: '0 2 * * *', // Daily at 2 AM
 *   timeZone: 'America/New_York',
 *   data: { target: 'temp_files' }
 * });
 * ```
 */
export async function setTrigger(
  triggerId: string,
  triggerData: CreateTriggerRequest,
  basebaseInstance?: Basebase
): Promise<TriggeredTask> {
  if (!triggerId || typeof triggerId !== "string") {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Trigger ID must be a non-empty string"
    );
  }

  const { token, baseUrl, projectId } = await getAuthContext(basebaseInstance);

  const url = `${baseUrl}/v1/projects/${projectId}/triggers/${triggerId}`;

  // Map user-friendly field names to server-expected structure
  const serverTriggerData = {
    taskId: triggerData.taskName,
    triggerType: "cron",
    config: {
      schedule: triggerData.schedule,
      timezone: triggerData.timeZone || "UTC",
    },
    enabled: triggerData.enabled !== undefined ? triggerData.enabled : true,
    ...(triggerData.name && { description: triggerData.name }),
    ...(triggerData.data && { taskParams: triggerData.data }),
  };

  const response = await makeHttpRequest<TriggeredTask>(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: serverTriggerData,
  });

  return response;
}

/**
 * Retrieves a triggered function by name
 *
 * @param triggerName - Name of the trigger to retrieve
 * @param basebaseInstance - Optional BaseBase instance
 * @returns Promise resolving to the trigger details
 *
 * @example
 * ```typescript
 * const trigger = await getTrigger('dailyCleanup');
 * console.log(`Next run: ${trigger.nextRun}`);
 * ```
 */
export async function getTrigger(
  triggerName: string,
  basebaseInstance?: Basebase
): Promise<TriggeredTask> {
  const { token, baseUrl, projectId } = await getAuthContext(basebaseInstance);

  const url = `${baseUrl}/v1/projects/${projectId}/triggers/${triggerName}`;

  const response = await makeHttpRequest<TriggeredTask>(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response;
}

/**
 * Lists all triggered functions in the project
 *
 * @param basebaseInstance - Optional BaseBase instance
 * @returns Promise resolving to the list of triggers
 *
 * @example
 * ```typescript
 * const triggers = await listTriggers();
 * triggers.forEach(trigger => console.log(`${trigger.name}: ${trigger.schedule}`));
 * ```
 */
export async function listTriggers(
  basebaseInstance?: Basebase
): Promise<TriggeredTask[]> {
  const { token, baseUrl, projectId } = await getAuthContext(basebaseInstance);

  const url = `${baseUrl}/v1/projects/${projectId}/triggers`;

  const response = await makeHttpRequest<TriggerListResponse>(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.triggers;
}

/**
 * Updates an existing triggered function
 *
 * @param triggerName - Name of the trigger to update
 * @param updates - Trigger updates to apply
 * @param basebaseInstance - Optional BaseBase instance
 * @returns Promise resolving to the updated trigger
 *
 * @example
 * ```typescript
 * const updatedTrigger = await updateTrigger('dailyCleanup', {
 *   schedule: '0 3 * * *', // Change to 3 AM
 *   enabled: false
 * });
 * ```
 */
export async function updateTrigger(
  triggerName: string,
  updates: UpdateTriggerRequest,
  basebaseInstance?: Basebase
): Promise<TriggeredTask> {
  const { token, baseUrl, projectId } = await getAuthContext(basebaseInstance);

  const url = `${baseUrl}/v1/projects/${projectId}/triggers/${triggerName}`;

  // Map user-friendly field names to server-expected structure
  const serverUpdates: any = {};

  if (updates.schedule || updates.timeZone) {
    serverUpdates.config = {};
    if (updates.schedule) {
      serverUpdates.config.schedule = updates.schedule;
    }
    if (updates.timeZone) {
      serverUpdates.config.timezone = updates.timeZone;
    }
  }

  if (updates.enabled !== undefined) {
    serverUpdates.enabled = updates.enabled;
  }

  if (updates.description) {
    serverUpdates.description = updates.description;
  }

  if (updates.data) {
    serverUpdates.taskParams = updates.data;
  }

  const response = await makeHttpRequest<TriggeredTask>(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: serverUpdates,
  });

  return response;
}

/**
 * Deletes a triggered function
 *
 * @param triggerName - Name of the trigger to delete
 * @param basebaseInstance - Optional BaseBase instance
 * @returns Promise that resolves when deletion is complete
 *
 * @example
 * ```typescript
 * await deleteTrigger('dailyCleanup');
 * console.log('Trigger deleted successfully');
 * ```
 */
export async function deleteTrigger(
  triggerName: string,
  basebaseInstance?: Basebase
): Promise<void> {
  const { token, baseUrl, projectId } = await getAuthContext(basebaseInstance);

  const url = `${baseUrl}/v1/projects/${projectId}/triggers/${triggerName}`;

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
