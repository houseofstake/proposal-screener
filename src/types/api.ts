export interface ApiErrorResponse {
  error: string;
  message?: string;
  status?: number;
  retryAfter?: number;
  details?: string;
  cacheAge?: number;
}

/** Error code returned with 403 when the caller is not on the access allowlist. */
export const NOT_AUTHORIZED_ERROR = "not_authorized";
