import type { ErrorCode } from "./codes";

export interface AppError {
  readonly code: ErrorCode;
  readonly message: string;
  readonly details?: unknown;
}

export const appError = (
  code: ErrorCode,
  message: string,
  details?: unknown,
): AppError => ({
  code,
  message,
  ...(details !== undefined && { details }),
});

export const unauthorized = (message = "Não autorizado"): AppError =>
  appError("UNAUTHORIZED", message);

export const invalidCredentials = (
  message = "Credenciais inválidas",
): AppError => appError("INVALID_CREDENTIALS", message);

export const forbidden = (message = "Permissão insuficiente"): AppError =>
  appError("FORBIDDEN", message);

export const notFound = (resource: string): AppError =>
  appError("RESOURCE_NOT_FOUND", `${resource} não encontrado`);

export const conflict = (message: string): AppError =>
  appError("CONFLICT", message);

export const validationError = (message: string, details?: unknown): AppError =>
  appError("VALIDATION_ERROR", message, details);

export const badRequest = (message: string): AppError =>
  appError("BAD_REQUEST", message);

export const databaseError = (message = "Erro de banco de dados"): AppError =>
  appError("DATABASE_ERROR", message);

export const rateLimited = (
  retryAfterSeconds: number,
  message = "Muitas requisições",
): AppError => appError("RATE_LIMITED", message, { retryAfterSeconds });

export const userNotFound = (message = "Usuário não encontrado"): AppError =>
  appError("USER_NOT_FOUND", message);

export const workspaceNotFound = (
  message = "Workspace não encontrada",
): AppError => appError("WORKSPACE_NOT_FOUND", message);

export const workspaceSlugTaken = (
  message = "Este slug de workspace já está em uso",
): AppError => appError("WORKSPACE_SLUG_TAKEN", message);

export const workspaceForbidden = (
  message = "Você não tem acesso a esta workspace",
): AppError => appError("WORKSPACE_FORBIDDEN", message);

export const workspaceInviteNotFound = (
  message = "Convite não encontrado",
): AppError => appError("WORKSPACE_INVITE_NOT_FOUND", message);

export const workspaceInviteDisabled = (
  message = "Este convite está desativado",
): AppError => appError("WORKSPACE_INVITE_DISABLED", message);

export const workspaceAlreadyMember = (
  message = "Você já é membro deste workspace",
): AppError => appError("WORKSPACE_ALREADY_MEMBER", message);

export const companyNotFound = (message = "Empresa não encontrada"): AppError =>
  appError("COMPANY_NOT_FOUND", message);

export const companyDomainTaken = (
  message = "Já existe uma empresa com este domínio nesta workspace",
): AppError => appError("COMPANY_DOMAIN_TAKEN", message);

export const personNotFound = (message = "Pessoa não encontrada"): AppError =>
  appError("PERSON_NOT_FOUND", message);

export const opportunityNotFound = (
  message = "Oportunidade não encontrada",
): AppError => appError("OPPORTUNITY_NOT_FOUND", message);

export const taskNotFound = (message = "Tarefa não encontrada"): AppError =>
  appError("TASK_NOT_FOUND", message);

export const noteNotFound = (message = "Anotação não encontrada"): AppError =>
  appError("NOTE_NOT_FOUND", message);

export const dashboardNotFound = (
  message = "Dashboard não encontrado",
): AppError => appError("DASHBOARD_NOT_FOUND", message);

export const dashboardWidgetNotFound = (
  message = "Widget não encontrado",
): AppError => appError("DASHBOARD_WIDGET_NOT_FOUND", message);

export const socialConnectionNotFound = (
  message = "Conexão de rede social não encontrada",
): AppError => appError("SOCIAL_CONNECTION_NOT_FOUND", message);

export const socialProviderNotConfigured = (
  message = "Integração não configurada. Faltam credenciais no servidor.",
): AppError => appError("SOCIAL_PROVIDER_NOT_CONFIGURED", message);

export const socialStateInvalid = (
  message = "Requisição de conexão inválida ou expirada",
): AppError => appError("SOCIAL_STATE_INVALID", message);

export const socialOauthFailed = (
  message = "Falha ao conectar com o provedor",
): AppError => appError("SOCIAL_OAUTH_FAILED", message);

export const socialTokenExpired = (
  message = "A sessão da rede social expirou. Reconecte a conta.",
): AppError => appError("SOCIAL_TOKEN_EXPIRED", message);

export const socialScopeMissing = (
  message = "Permissão ausente. Reconecte a conta para conceder o novo acesso.",
): AppError => appError("SOCIAL_SCOPE_MISSING", message);

export const socialNoPage = (
  message = "Nenhuma Página foi concedida. Reconecte e selecione uma Página do Facebook.",
): AppError => appError("SOCIAL_NO_PAGE", message);

export const socialIgNotLinked = (
  message = "Nenhuma Página possui conta do Instagram Business/Creator vinculada. Vincule no Facebook e reconecte.",
): AppError => appError("SOCIAL_IG_NOT_LINKED", message);

export const integrationKeyInvalid = (
  message = "Chave de API ausente ou inválida",
): AppError => appError("INTEGRATION_KEY_INVALID", message);

export const integrationKeyNotFound = (
  message = "Chave de API não encontrada",
): AppError => appError("INTEGRATION_KEY_NOT_FOUND", message);
