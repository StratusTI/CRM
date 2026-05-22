export const ERROR_CODES = {
  // Authentication & Authorization (401, 403)
  UNAUTHORIZED: { code: "UNAUTHORIZED", status: 401 },
  INVALID_TOKEN: { code: "INVALID_TOKEN", status: 401 },
  TOKEN_EXPIRED: { code: "TOKEN_EXPIRED", status: 401 },
  INVALID_CREDENTIALS: { code: "INVALID_CREDENTIALS", status: 401 },
  FORBIDDEN: { code: "FORBIDDEN", status: 403 },
  INSUFFICIENT_PERMISSIONS: { code: "INSUFFICIENT_PERMISSIONS", status: 403 },

  // Client Errors (400, 404, 409, 422, 429)
  BAD_REQUEST: { code: "BAD_REQUEST", status: 400 },
  VALIDATION_ERROR: { code: "VALIDATION_ERROR", status: 422 },
  RESOURCE_NOT_FOUND: { code: "RESOURCE_NOT_FOUND", status: 404 },
  CONFLICT: { code: "CONFLICT", status: 409 },
  RATE_LIMITED: { code: "RATE_LIMITED", status: 429 },

  // User domain
  USER_NOT_FOUND: { code: "USER_NOT_FOUND", status: 404 },

  // Workspace domain
  WORKSPACE_NOT_FOUND: { code: "WORKSPACE_NOT_FOUND", status: 404 },
  WORKSPACE_SLUG_TAKEN: { code: "WORKSPACE_SLUG_TAKEN", status: 409 },
  WORKSPACE_FORBIDDEN: { code: "WORKSPACE_FORBIDDEN", status: 403 },

  // Company domain
  COMPANY_NOT_FOUND: { code: "COMPANY_NOT_FOUND", status: 404 },
  COMPANY_DOMAIN_TAKEN: { code: "COMPANY_DOMAIN_TAKEN", status: 409 },

  // Person / Opportunity / Task / Note domain
  PERSON_NOT_FOUND: { code: "PERSON_NOT_FOUND", status: 404 },
  OPPORTUNITY_NOT_FOUND: { code: "OPPORTUNITY_NOT_FOUND", status: 404 },
  TASK_NOT_FOUND: { code: "TASK_NOT_FOUND", status: 404 },
  NOTE_NOT_FOUND: { code: "NOTE_NOT_FOUND", status: 404 },
  DASHBOARD_NOT_FOUND: { code: "DASHBOARD_NOT_FOUND", status: 404 },
  DASHBOARD_WIDGET_NOT_FOUND: {
    code: "DASHBOARD_WIDGET_NOT_FOUND",
    status: 404,
  },

  // Social connection domain
  SOCIAL_CONNECTION_NOT_FOUND: {
    code: "SOCIAL_CONNECTION_NOT_FOUND",
    status: 404,
  },
  SOCIAL_PROVIDER_NOT_CONFIGURED: {
    code: "SOCIAL_PROVIDER_NOT_CONFIGURED",
    status: 400,
  },
  SOCIAL_STATE_INVALID: { code: "SOCIAL_STATE_INVALID", status: 400 },
  SOCIAL_OAUTH_FAILED: { code: "SOCIAL_OAUTH_FAILED", status: 502 },
  SOCIAL_TOKEN_EXPIRED: { code: "SOCIAL_TOKEN_EXPIRED", status: 401 },
  SOCIAL_SCOPE_MISSING: { code: "SOCIAL_SCOPE_MISSING", status: 403 },

  // Server Errors (500)
  INTERNAL_SERVER_ERROR: { code: "INTERNAL_SERVER_ERROR", status: 500 },
  DATABASE_ERROR: { code: "DATABASE_ERROR", status: 500 },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;
