/**
 * Document-specific utility functions for BaseBase SDK
 */

import { BasebaseDocument, BasebaseDocumentData } from "./types";
import { makeHttpRequest } from "./utils";
import { getAuthHeader } from "./auth";
import { toBasebaseValue } from "./utils";

/**
 * Makes a document request with proper formatting and error handling
 */
export async function makeDocumentRequest<T = any>(
  url: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  data?: BasebaseDocumentData,
  options?: {
    merge?: boolean;
    mergeFields?: string[];
  }
): Promise<T> {
  let requestData: BasebaseDocument | undefined;

  if (data) {
    if (method === "PATCH") {
      // For PATCH requests, wrap each field in a fields object
      requestData = {
        fields: Object.fromEntries(
          Object.entries(data).map(([key, value]) => [
            key,
            toBasebaseValue(value),
          ])
        ),
      };
    } else {
      // For other requests, use standard document format
      requestData = {
        fields: Object.fromEntries(
          Object.entries(data).map(([key, value]) => [
            key,
            toBasebaseValue(value),
          ])
        ),
      };
    }
  }

  return makeHttpRequest<T>(url, {
    method,
    headers: getAuthHeader(),
    body: requestData,
  });
}
