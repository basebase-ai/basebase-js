/**
 * BaseBase Project Creation Module
 * Handles project creation, repository setup, and service deployment
 */

import {
  Basebase,
  CreateProjectRequest,
  CreateProjectResponse,
  CreateRepositoryRequest,
  CreateRepositoryResponse,
  CreateServiceRequest,
  CreateServiceResponse,
  BasebaseError,
  BASEBASE_ERROR_CODES,
  getGlobalBaseUrl,
  API_VERSION,
} from "./types";
import { makeHttpRequest, validateProjectId } from "./utils";
import { getToken, getAuthState } from "./auth";

// ========================================
// Project Creation Functions
// ========================================

/**
 * Creates a new project document in the database
 *
 * @param request - Project creation request data
 * @param basebaseInstance - Optional Basebase instance (uses default if not provided)
 * @returns Promise resolving to project creation response
 *
 * @example
 * ```typescript
 * const result = await createProject({
 *   projectId: "my-app",
 *   name: "My App",
 *   description: "A cool new app",
 *   categories: ["web", "saas"]
 * });
 *
 * console.log(result.project.id); // "my-app"
 * console.log(result.project.apiKey); // "bbs_abc123..."
 * ```
 */
export async function createProject(
  request: CreateProjectRequest,
  basebaseInstance?: Basebase
): Promise<CreateProjectResponse> {
  // Validate required fields
  if (!request.projectId) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "projectId is required"
    );
  }

  if (!request.name) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "name is required"
    );
  }

  // Validate project ID format
  validateProjectId(request.projectId);

  // Get authentication context
  const { token, baseUrl } = await getAuthContextBasic(basebaseInstance);

  // Build API URL
  const url = `${baseUrl}/${API_VERSION}/create-project`;

  try {
    const response = await makeHttpRequest<CreateProjectResponse>(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: request,
    });

    return response;
  } catch (error) {
    if (error instanceof BasebaseError) {
      throw error;
    }
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.NETWORK_ERROR,
      `Failed to create project: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Creates a GitHub repository for an existing project
 * Forks the starter template and updates configuration
 *
 * @param request - Repository creation request data
 * @param basebaseInstance - Optional Basebase instance (uses default if not provided)
 * @returns Promise resolving to repository creation response
 *
 * @example
 * ```typescript
 * const result = await createRepository({
 *   projectId: "my-app"
 * });
 *
 * console.log(result.repository.url); // "https://github.com/basebase-ai/my-app"
 * console.log(result.repository.cloneUrl); // "https://github.com/basebase-ai/my-app.git"
 * ```
 */
export async function createRepository(
  request: CreateRepositoryRequest,
  basebaseInstance?: Basebase
): Promise<CreateRepositoryResponse> {
  // Validate required fields
  if (!request.projectId) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "projectId is required"
    );
  }

  // Validate project ID format
  validateProjectId(request.projectId);

  // Get authentication context
  const { token, baseUrl } = await getAuthContextBasic(basebaseInstance);

  // Build API URL
  const url = `${baseUrl}/${API_VERSION}/create-repo`;

  try {
    const response = await makeHttpRequest<CreateRepositoryResponse>(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: request,
    });

    return response;
  } catch (error) {
    if (error instanceof BasebaseError) {
      throw error;
    }
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.NETWORK_ERROR,
      `Failed to create repository: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Creates a Railway service for an existing project
 * Creates Railway service, triggers deployment, and sets up custom domain
 *
 * @param request - Service creation request data
 * @param basebaseInstance - Optional Basebase instance (uses default if not provided)
 * @returns Promise resolving to service creation response
 *
 * @example
 * ```typescript
 * const result = await createService({
 *   projectId: "my-app"
 * });
 *
 * console.log(result.service.domain); // "my-app.basebase.ai"
 * console.log(result.service.deploymentUrl); // "https://my-app.basebase.ai/"
 * ```
 */
export async function createService(
  request: CreateServiceRequest,
  basebaseInstance?: Basebase
): Promise<CreateServiceResponse> {
  // Validate required fields
  if (!request.projectId) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.INVALID_ARGUMENT,
      "projectId is required"
    );
  }

  // Validate project ID format
  validateProjectId(request.projectId);

  // Get authentication context
  const { token, baseUrl } = await getAuthContextBasic(basebaseInstance);

  // Build API URL
  const url = `${baseUrl}/${API_VERSION}/create-service`;

  try {
    const response = await makeHttpRequest<CreateServiceResponse>(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: request,
    });

    return response;
  } catch (error) {
    if (error instanceof BasebaseError) {
      throw error;
    }
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.NETWORK_ERROR,
      `Failed to create service: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Convenience function to create a complete project setup
 * Creates project document, repository, and service in sequence
 *
 * @param projectData - Project creation data
 * @param basebaseInstance - Optional Basebase instance (uses default if not provided)
 * @returns Promise resolving to all creation results
 *
 * @example
 * ```typescript
 * const result = await createCompleteProject({
 *   projectId: "my-app",
 *   name: "My App",
 *   description: "A cool new app",
 *   categories: ["web", "saas"]
 * });
 *
 * console.log(result.project.id); // "my-app"
 * console.log(result.repository.url); // "https://github.com/basebase-ai/my-app"
 * console.log(result.service.domain); // "my-app.basebase.ai"
 * ```
 */
export async function createCompleteProject(
  projectData: CreateProjectRequest,
  basebaseInstance?: Basebase
): Promise<{
  project: CreateProjectResponse;
  repository: CreateRepositoryResponse;
  service: CreateServiceResponse;
}> {
  // Step 1: Create project document
  const project = await createProject(projectData, basebaseInstance);

  // Step 2: Create repository
  const repository = await createRepository(
    { projectId: projectData.projectId },
    basebaseInstance
  );

  // Step 3: Create service
  const service = await createService(
    { projectId: projectData.projectId },
    basebaseInstance
  );

  return { project, repository, service };
}

// ========================================
// Helper Functions
// ========================================

/**
 * Gets authentication context for API requests
 */
async function getAuthContextBasic(basebaseInstance?: Basebase): Promise<{
  token: string;
  baseUrl: string;
}> {
  let token: string;
  let baseUrl: string;

  if (basebaseInstance) {
    // Use provided instance
    token = basebaseInstance.app.options.token || "";
    baseUrl = basebaseInstance.baseUrl;
  } else {
    // Use global state
    const authState = getAuthState();
    if (!authState.isAuthenticated || !authState.token) {
      throw new BasebaseError(
        BASEBASE_ERROR_CODES.UNAUTHENTICATED,
        "Authentication required. Please call verifyCode() first."
      );
    }
    token = authState.token;
    baseUrl = getGlobalBaseUrl();
  }

  if (!token) {
    throw new BasebaseError(
      BASEBASE_ERROR_CODES.UNAUTHENTICATED,
      "No authentication token available"
    );
  }

  return { token, baseUrl };
}
