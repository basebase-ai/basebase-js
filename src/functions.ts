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
  TaskReference,
  TriggersReference,
  TriggerReference,
  SetTaskData,
  UpdateTaskData,
  CreateTriggerData,
  UpdateTriggerData,
} from "./types";
import {
  makeHttpRequest,
  buildTaskDoPath,
  validatePath,
  validateProjectId,
  parsePath,
} from "./utils";
import { getToken, getAuthState } from "./auth";

// ========================================
// Task and Trigger Reference Functions (Firebase-style)
// ========================================

/**
 * Creates a task reference for a specific task in a project
 */
export function task(db: Basebase, path: string): TaskReference {
  validatePath(path);

  const pathSegments = path.split("/");

  // Task paths need exactly 2 segments: projectName/taskName
  if (pathSegments.length !== 2) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Task path must include project name and task name (e.g., 'myproject/myTask')"
    );
  }

  const projectName = pathSegments[0];
  const taskName = pathSegments[1];

  if (!projectName || !taskName) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Project name and task name cannot be empty"
    );
  }

  validateProjectId(projectName);

  return new TaskReferenceImpl(db, path, taskName);
}

/**
 * Creates a triggers reference for a specific project
 */
export function triggers(db: Basebase, projectPath: string): TriggersReference {
  validatePath(projectPath);

  // Project path should be just the project name
  if (projectPath.includes("/")) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "Triggers path should be just the project name (e.g., 'myproject')"
    );
  }

  validateProjectId(projectPath);

  return new TriggersReferenceImpl(db, projectPath);
}

// ========================================
// Task Reference Implementation
// ========================================

class TaskReferenceImpl implements TaskReference {
  public readonly id: string;
  public readonly path: string;
  public readonly basebase: Basebase;

  constructor(basebase: Basebase, path: string, id: string) {
    this.basebase = basebase;
    this.path = path;
    this.id = id;
  }

  async get(): Promise<CloudTask> {
    const { token, baseUrl, projectId } = await getAuthContext(this.basebase);
    const url = `${baseUrl}/v1/projects/${projectId}/tasks/${this.id}`;

    const response = await makeHttpRequest<CloudTask>(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response;
  }

  async set(data: SetTaskData): Promise<CloudTask> {
    const { token, baseUrl, projectId } = await getAuthContext(this.basebase);
    const url = `${baseUrl}/v1/projects/${projectId}/tasks/${this.id}`;

    const serverTaskData: SetTaskRequest = {
      id: this.id,
      implementationCode: data.code,
      description: data.description || "A BaseBase task",
      timeout: data.timeout,
      memoryMB: data.memoryMB,
      runtime: data.runtime,
      environmentVariables: data.environmentVariables,
    };

    const response = await makeHttpRequest<CloudTask>(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: serverTaskData,
    });

    return response;
  }

  async update(data: UpdateTaskData): Promise<CloudTask> {
    const { token, baseUrl, projectId } = await getAuthContext(this.basebase);
    const url = `${baseUrl}/v1/projects/${projectId}/tasks/${this.id}`;

    const serverUpdates: UpdateTaskRequest = {};
    if (data.code !== undefined) serverUpdates.implementationCode = data.code;
    if (data.description !== undefined)
      serverUpdates.description = data.description;
    if (data.timeout !== undefined) serverUpdates.timeout = data.timeout;
    if (data.memoryMB !== undefined) serverUpdates.memoryMB = data.memoryMB;
    if (data.runtime !== undefined) serverUpdates.runtime = data.runtime;
    if (data.environmentVariables !== undefined)
      serverUpdates.environmentVariables = data.environmentVariables;

    const response = await makeHttpRequest<CloudTask>(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: serverUpdates,
    });

    return response;
  }

  async delete(): Promise<void> {
    const { token, baseUrl, projectId } = await getAuthContext(this.basebase);
    const url = `${baseUrl}/v1/projects/${projectId}/tasks/${this.id}`;

    await makeHttpRequest<void>(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
}

// ========================================
// Triggers Reference Implementation
// ========================================

class TriggersReferenceImpl implements TriggersReference {
  public readonly id: string;
  public readonly path: string;
  public readonly basebase: Basebase;

  constructor(basebase: Basebase, projectId: string) {
    this.basebase = basebase;
    this.path = projectId;
    this.id = projectId;
  }

  async add(data: CreateTriggerData): Promise<TriggeredTask> {
    const { token, baseUrl, projectId } = await getAuthContext(this.basebase);
    const url = `${baseUrl}/v1/projects/${projectId}/triggers`;

    const serverTriggerData = {
      taskId: data.taskName,
      triggerType: "cron",
      config: {
        schedule: data.schedule,
        timezone: data.timeZone || "UTC",
      },
      enabled: data.enabled !== undefined ? data.enabled : true,
      ...(data.name && { description: data.name }),
      ...(data.data && { taskParams: data.data }),
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

  trigger(triggerId: string): TriggerReference {
    return new TriggerReferenceImpl(
      this.basebase,
      `${this.path}/${triggerId}`,
      triggerId
    );
  }
}

// ========================================
// Trigger Reference Implementation
// ========================================

class TriggerReferenceImpl implements TriggerReference {
  public readonly id: string;
  public readonly path: string;
  public readonly basebase: Basebase;

  constructor(basebase: Basebase, path: string, id: string) {
    this.basebase = basebase;
    this.path = path;
    this.id = id;
  }

  async get(): Promise<TriggeredTask> {
    const { token, baseUrl, projectId } = await getAuthContext(this.basebase);
    const url = `${baseUrl}/v1/projects/${projectId}/triggers/${this.id}`;

    const response = await makeHttpRequest<TriggeredTask>(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response;
  }

  async set(data: CreateTriggerData): Promise<TriggeredTask> {
    const { token, baseUrl, projectId } = await getAuthContext(this.basebase);
    const url = `${baseUrl}/v1/projects/${projectId}/triggers/${this.id}`;

    const serverTriggerData = {
      taskId: data.taskName,
      triggerType: "cron",
      config: {
        schedule: data.schedule,
        timezone: data.timeZone || "UTC",
      },
      enabled: data.enabled !== undefined ? data.enabled : true,
      ...(data.name && { description: data.name }),
      ...(data.data && { taskParams: data.data }),
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

  async update(data: UpdateTriggerData): Promise<TriggeredTask> {
    const { token, baseUrl, projectId } = await getAuthContext(this.basebase);
    const url = `${baseUrl}/v1/projects/${projectId}/triggers/${this.id}`;

    const serverUpdates: any = {};
    if (data.taskName !== undefined) serverUpdates.taskId = data.taskName;
    if (data.schedule !== undefined || data.timeZone !== undefined) {
      serverUpdates.config = {};
      if (data.schedule !== undefined)
        serverUpdates.config.schedule = data.schedule;
      if (data.timeZone !== undefined)
        serverUpdates.config.timezone = data.timeZone;
    }
    if (data.enabled !== undefined) serverUpdates.enabled = data.enabled;
    if (data.name !== undefined) serverUpdates.description = data.name;
    if (data.data !== undefined) serverUpdates.taskParams = data.data;

    const response = await makeHttpRequest<TriggeredTask>(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: serverUpdates,
    });

    return response;
  }

  async delete(): Promise<void> {
    const { token, baseUrl, projectId } = await getAuthContext(this.basebase);
    const url = `${baseUrl}/v1/projects/${projectId}/triggers/${this.id}`;

    await makeHttpRequest<void>(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
}

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
 * Sets a task with a specific task reference (Firebase-style)
 *
 * @param taskRef - Task reference created with task() function
 * @param data - Task configuration with user-friendly field names
 * @returns Promise resolving to the created task
 *
 * @example
 * ```typescript
 * const taskRef = task(db, 'myproject/myTask');
 * const task = await setTask(taskRef, {
 *   code: 'exports.handler = async (data) => { return { message: "Hello!" }; }',
 *   description: 'My custom task'
 * });
 * ```
 */
export async function setTask(
  taskRef: TaskReference,
  data: SetTaskData
): Promise<CloudTask> {
  return taskRef.set(data);
}

/**
 * Retrieves a cloud task using a task reference (Firebase-style)
 *
 * @param taskRef - Task reference created with task() function
 * @returns Promise resolving to the task details
 *
 * @example
 * ```typescript
 * const taskRef = task(db, 'myproject/myTask');
 * const task = await getTask(taskRef);
 * console.log(task.implementationCode);
 * ```
 */
export async function getTask(taskRef: TaskReference): Promise<CloudTask> {
  return taskRef.get();
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
 * Updates an existing cloud task using a task reference (Firebase-style)
 *
 * @param taskRef - Task reference created with task() function
 * @param updates - Fields to update with user-friendly field names
 * @returns Promise resolving to the updated task
 *
 * @example
 * ```typescript
 * const taskRef = task(db, 'myproject/myTask');
 * const updatedTask = await updateTask(taskRef, {
 *   code: 'exports.handler = async (data) => { return { message: "Updated!" }; }',
 *   timeout: 60
 * });
 * ```
 */
export async function updateTask(
  taskRef: TaskReference,
  updates: UpdateTaskData
): Promise<CloudTask> {
  return taskRef.update(updates);
}

/**
 * Deletes a cloud task using a task reference (Firebase-style)
 *
 * @param taskRef - Task reference created with task() function
 * @returns Promise that resolves when deletion is complete
 *
 * @example
 * ```typescript
 * const taskRef = task(db, 'myproject/myTask');
 * await deleteTask(taskRef);
 * console.log('Task deleted successfully');
 * ```
 */
export async function deleteTask(taskRef: TaskReference): Promise<void> {
  return taskRef.delete();
}

// ========================================
// Task Triggering
// ========================================

/**
 * Adds a triggered task using a triggers reference (Firebase-style)
 *
 * @param triggersRef - Triggers reference created with triggers() function
 * @param data - Trigger configuration
 * @returns Promise resolving to the created trigger
 *
 * @example
 * ```typescript
 * const triggersRef = triggers(db, 'myproject');
 * const trigger = await addTrigger(triggersRef, {
 *   name: 'dailyCleanup',
 *   taskName: 'cleanupTask',
 *   schedule: '0 2 * * *', // Daily at 2 AM
 *   timeZone: 'America/New_York',
 *   data: { target: 'temp_files' }
 * });
 * ```
 */
export async function addTrigger(
  triggersRef: TriggersReference,
  data: CreateTriggerData
): Promise<TriggeredTask> {
  return triggersRef.add(data);
}

/**
 * Sets a triggered task using a trigger reference (Firebase-style)
 *
 * @param triggerRef - Trigger reference created with triggers().trigger() function
 * @param data - Trigger configuration
 * @returns Promise resolving to the created trigger
 *
 * @example
 * ```typescript
 * const triggersRef = triggers(db, 'myproject');
 * const triggerRef = triggersRef.trigger('my-daily-cleanup');
 * const trigger = await setTrigger(triggerRef, {
 *   name: 'dailyCleanup',
 *   taskName: 'cleanupTask',
 *   schedule: '0 2 * * *', // Daily at 2 AM
 *   timeZone: 'America/New_York',
 *   data: { target: 'temp_files' }
 * });
 * ```
 */
export async function setTrigger(
  triggerRef: TriggerReference,
  data: CreateTriggerData
): Promise<TriggeredTask> {
  return triggerRef.set(data);
}

/**
 * Gets a triggered function using a trigger reference (Firebase-style)
 *
 * @param triggerRef - Trigger reference created with triggers().trigger() function
 * @returns Promise resolving to the trigger details
 *
 * @example
 * ```typescript
 * const triggersRef = triggers(db, 'myproject');
 * const triggerRef = triggersRef.trigger('dailyCleanup');
 * const trigger = await getTrigger(triggerRef);
 * console.log(`Next run: ${trigger.nextRun}`);
 * ```
 */
export async function getTrigger(
  triggerRef: TriggerReference
): Promise<TriggeredTask> {
  return triggerRef.get();
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
 * Updates an existing triggered function using a trigger reference (Firebase-style)
 *
 * @param triggerRef - Trigger reference created with triggers().trigger() function
 * @param updates - Trigger updates to apply
 * @returns Promise resolving to the updated trigger
 *
 * @example
 * ```typescript
 * const triggersRef = triggers(db, 'myproject');
 * const triggerRef = triggersRef.trigger('dailyCleanup');
 * const updatedTrigger = await updateTrigger(triggerRef, {
 *   schedule: '0 3 * * *', // Change to 3 AM
 *   enabled: false
 * });
 * ```
 */
export async function updateTrigger(
  triggerRef: TriggerReference,
  updates: UpdateTriggerData
): Promise<TriggeredTask> {
  return triggerRef.update(updates);
}

/**
 * Deletes a triggered function using a trigger reference (Firebase-style)
 *
 * @param triggerRef - Trigger reference created with triggers().trigger() function
 * @returns Promise that resolves when deletion is complete
 *
 * @example
 * ```typescript
 * const triggersRef = triggers(db, 'myproject');
 * const triggerRef = triggersRef.trigger('dailyCleanup');
 * await deleteTrigger(triggerRef);
 * console.log('Trigger deleted successfully');
 * ```
 */
export async function deleteTrigger(
  triggerRef: TriggerReference
): Promise<void> {
  return triggerRef.delete();
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
