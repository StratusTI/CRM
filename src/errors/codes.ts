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
  WORKSPACE_INVITE_NOT_FOUND: {
    code: "WORKSPACE_INVITE_NOT_FOUND",
    status: 404,
  },
  WORKSPACE_INVITE_DISABLED: { code: "WORKSPACE_INVITE_DISABLED", status: 410 },
  WORKSPACE_ALREADY_MEMBER: { code: "WORKSPACE_ALREADY_MEMBER", status: 409 },

  // Company domain
  COMPANY_NOT_FOUND: { code: "COMPANY_NOT_FOUND", status: 404 },
  COMPANY_DOMAIN_TAKEN: { code: "COMPANY_DOMAIN_TAKEN", status: 409 },
  COMPANY_CNPJ_TAKEN: { code: "COMPANY_CNPJ_TAKEN", status: 409 },

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
  SOCIAL_NO_PAGE: { code: "SOCIAL_NO_PAGE", status: 400 },
  SOCIAL_IG_NOT_LINKED: { code: "SOCIAL_IG_NOT_LINKED", status: 400 },

  // Scheduled posts domain
  SCHEDULED_POST_NOT_FOUND: { code: "SCHEDULED_POST_NOT_FOUND", status: 404 },
  SCHEDULED_POST_INVALID: { code: "SCHEDULED_POST_INVALID", status: 422 },
  STORAGE_NOT_CONFIGURED: { code: "STORAGE_NOT_CONFIGURED", status: 503 },

  // Integration API key domain
  INTEGRATION_KEY_INVALID: { code: "INTEGRATION_KEY_INVALID", status: 401 },
  INTEGRATION_KEY_NOT_FOUND: { code: "INTEGRATION_KEY_NOT_FOUND", status: 404 },

  // Email marketing domain
  EMAIL_TEMPLATE_NOT_FOUND: { code: "EMAIL_TEMPLATE_NOT_FOUND", status: 404 },
  EMAIL_CAMPAIGN_NOT_FOUND: { code: "EMAIL_CAMPAIGN_NOT_FOUND", status: 404 },
  MAILING_LIST_NOT_FOUND: { code: "MAILING_LIST_NOT_FOUND", status: 404 },
  EMAIL_PROVIDER_NOT_CONFIGURED: {
    code: "EMAIL_PROVIDER_NOT_CONFIGURED",
    status: 400,
  },
  EMAIL_NO_RECIPIENTS: { code: "EMAIL_NO_RECIPIENTS", status: 422 },
  EMAIL_SEND_FAILED: { code: "EMAIL_SEND_FAILED", status: 502 },

  // Workflow domain
  WORKFLOW_NOT_FOUND: { code: "WORKFLOW_NOT_FOUND", status: 404 },
  WORKFLOW_VERSION_NOT_FOUND: {
    code: "WORKFLOW_VERSION_NOT_FOUND",
    status: 404,
  },
  WORKFLOW_RUN_NOT_FOUND: { code: "WORKFLOW_RUN_NOT_FOUND", status: 404 },
  WORKFLOW_INVALID_DEFINITION: {
    code: "WORKFLOW_INVALID_DEFINITION",
    status: 422,
  },
  WORKFLOW_TRIGGER_INVALID: { code: "WORKFLOW_TRIGGER_INVALID", status: 422 },
  WORKFLOW_VERSION_NOT_DRAFT: {
    code: "WORKFLOW_VERSION_NOT_DRAFT",
    status: 409,
  },
  WORKFLOW_NOT_ACTIVE: { code: "WORKFLOW_NOT_ACTIVE", status: 409 },
  WORKFLOW_WEBHOOK_INVALID: { code: "WORKFLOW_WEBHOOK_INVALID", status: 404 },
  WORKFLOW_EXECUTION_FAILED: {
    code: "WORKFLOW_EXECUTION_FAILED",
    status: 500,
  },

  // Proposal domain
  PROPOSAL_NOT_FOUND: { code: "PROPOSAL_NOT_FOUND", status: 404 },
  PROPOSAL_FORBIDDEN: { code: "PROPOSAL_FORBIDDEN", status: 403 },
  PROPOSAL_NOT_PUBLISHED: { code: "PROPOSAL_NOT_PUBLISHED", status: 404 },

  // Document template domain
  DOCUMENT_TEMPLATE_NOT_FOUND: {
    code: "DOCUMENT_TEMPLATE_NOT_FOUND",
    status: 404,
  },

  // Landing page domain
  LANDING_PAGE_NOT_FOUND: { code: "LANDING_PAGE_NOT_FOUND", status: 404 },
  LANDING_PAGE_NOT_PUBLISHED: {
    code: "LANDING_PAGE_NOT_PUBLISHED",
    status: 404,
  },
  LANDING_PAGE_SLUG_TAKEN: { code: "LANDING_PAGE_SLUG_TAKEN", status: 409 },

  // Form domain
  FORM_NOT_FOUND: { code: "FORM_NOT_FOUND", status: 404 },
  FORM_NOT_PUBLISHED: { code: "FORM_NOT_PUBLISHED", status: 404 },
  FORM_FIELD_INVALID: { code: "FORM_FIELD_INVALID", status: 422 },

  // AI assistant domain
  AI_NOT_CONFIGURED: { code: "AI_NOT_CONFIGURED", status: 503 },
  AI_CONVERSATION_NOT_FOUND: {
    code: "AI_CONVERSATION_NOT_FOUND",
    status: 404,
  },
  AI_PROVIDER_FAILED: { code: "AI_PROVIDER_FAILED", status: 502 },
  AI_MESSAGE_INVALID: { code: "AI_MESSAGE_INVALID", status: 422 },

  // Server Errors (500)
  INTERNAL_SERVER_ERROR: { code: "INTERNAL_SERVER_ERROR", status: 500 },
  DATABASE_ERROR: { code: "DATABASE_ERROR", status: 500 },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;
