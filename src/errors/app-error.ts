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

export const companyCnpjTaken = (
  message = "Já existe uma empresa com este CNPJ nesta workspace",
): AppError => appError("COMPANY_CNPJ_TAKEN", message);

export const personNotFound = (message = "Pessoa não encontrada"): AppError =>
  appError("PERSON_NOT_FOUND", message);

export const opportunityNotFound = (
  message = "Oportunidade não encontrada",
): AppError => appError("OPPORTUNITY_NOT_FOUND", message);

export const pipelineNotFound = (
  message = "Pipeline não encontrado",
): AppError => appError("PIPELINE_NOT_FOUND", message);

export const pipelineStageNotFound = (
  message = "Etapa não encontrada",
): AppError => appError("PIPELINE_STAGE_NOT_FOUND", message);

export const pipelineInUse = (
  message = "Pipeline possui oportunidades e não pode ser excluído",
): AppError => appError("PIPELINE_IN_USE", message);

export const pipelineStageInUse = (
  message = "Etapa possui oportunidades e não pode ser removida",
): AppError => appError("PIPELINE_STAGE_IN_USE", message);

export const pipelineDefaultProtected = (
  message = "O pipeline padrão não pode ser excluído",
): AppError => appError("PIPELINE_DEFAULT_PROTECTED", message);

export const productNotFound = (message = "Produto não encontrado"): AppError =>
  appError("PRODUCT_NOT_FOUND", message);

export const productSkuTaken = (
  message = "Já existe um produto com este SKU",
): AppError => appError("PRODUCT_SKU_TAKEN", message);

export const lineItemNotFound = (message = "Item não encontrado"): AppError =>
  appError("LINE_ITEM_NOT_FOUND", message);

export const quotaNotFound = (message = "Meta não encontrada"): AppError =>
  appError("QUOTA_NOT_FOUND", message);

export const customFieldNotFound = (
  message = "Campo customizado não encontrado",
): AppError => appError("CUSTOM_FIELD_NOT_FOUND", message);

export const customFieldKeyTaken = (
  message = "Já existe um campo com esta chave nesta entidade",
): AppError => appError("CUSTOM_FIELD_KEY_TAKEN", message);

export const customFieldInvalid = (message: string): AppError =>
  appError("CUSTOM_FIELD_INVALID", message);

export const profileNotFound = (message = "Perfil não encontrado"): AppError =>
  appError("PROFILE_NOT_FOUND", message);

export const profileNameTaken = (
  message = "Já existe um perfil com este nome",
): AppError => appError("PROFILE_NAME_TAKEN", message);

export const profileSystemProtected = (
  message = "Perfis de sistema não podem ser editados ou excluídos",
): AppError => appError("PROFILE_SYSTEM_PROTECTED", message);

export const profileInUse = (
  message = "Perfil atribuído a membros não pode ser excluído",
): AppError => appError("PROFILE_IN_USE", message);

export const lastOwnerProtected = (
  message = "A workspace precisa de ao menos um Proprietário",
): AppError => appError("LAST_OWNER_PROTECTED", message);

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

export const scheduledPostNotFound = (
  message = "Post agendado não encontrado",
): AppError => appError("SCHEDULED_POST_NOT_FOUND", message);

export const scheduledPostInvalid = (
  message: string,
  details?: unknown,
): AppError => appError("SCHEDULED_POST_INVALID", message, details);

export const storageNotConfigured = (
  message = "Armazenamento de mídia (MinIO/S3) não configurado.",
): AppError => appError("STORAGE_NOT_CONFIGURED", message);

export const integrationKeyInvalid = (
  message = "Chave de API ausente ou inválida",
): AppError => appError("INTEGRATION_KEY_INVALID", message);

export const integrationKeyNotFound = (
  message = "Chave de API não encontrada",
): AppError => appError("INTEGRATION_KEY_NOT_FOUND", message);

export const emailTemplateNotFound = (
  message = "Template de email não encontrado",
): AppError => appError("EMAIL_TEMPLATE_NOT_FOUND", message);

export const emailCampaignNotFound = (
  message = "Campanha de email não encontrada",
): AppError => appError("EMAIL_CAMPAIGN_NOT_FOUND", message);

export const mailingListNotFound = (
  message = "Lista de mailing não encontrada",
): AppError => appError("MAILING_LIST_NOT_FOUND", message);

export const emailProviderNotConfigured = (
  message = "Provedor de email não configurado. Verifique RESEND_API_KEY e EMAIL_FROM.",
): AppError => appError("EMAIL_PROVIDER_NOT_CONFIGURED", message);

export const emailNoRecipients = (
  message = "Nenhum destinatário com email cadastrado",
): AppError => appError("EMAIL_NO_RECIPIENTS", message);

export const emailSendFailed = (
  message = "Falha ao disparar o envio no provedor",
  details?: unknown,
): AppError => appError("EMAIL_SEND_FAILED", message, details);

export const workflowNotFound = (
  message = "Workflow não encontrado",
): AppError => appError("WORKFLOW_NOT_FOUND", message);

export const workflowVersionNotFound = (
  message = "Versão do workflow não encontrada",
): AppError => appError("WORKFLOW_VERSION_NOT_FOUND", message);

export const workflowRunNotFound = (
  message = "Execução do workflow não encontrada",
): AppError => appError("WORKFLOW_RUN_NOT_FOUND", message);

export const workflowInvalidDefinition = (
  message = "Definição do workflow inválida",
  details?: unknown,
): AppError => appError("WORKFLOW_INVALID_DEFINITION", message, details);

export const workflowTriggerInvalid = (
  message = "Trigger inválido para esta operação",
): AppError => appError("WORKFLOW_TRIGGER_INVALID", message);

export const workflowVersionNotDraft = (
  message = "Só é possível editar a versão DRAFT",
): AppError => appError("WORKFLOW_VERSION_NOT_DRAFT", message);

export const workflowNotActive = (
  message = "O workflow não está ativo",
): AppError => appError("WORKFLOW_NOT_ACTIVE", message);

export const workflowWebhookInvalid = (
  message = "Webhook inválido ou desativado",
): AppError => appError("WORKFLOW_WEBHOOK_INVALID", message);

export const workflowExecutionFailed = (
  message = "Falha ao executar o workflow",
  details?: unknown,
): AppError => appError("WORKFLOW_EXECUTION_FAILED", message, details);

export const proposalNotFound = (
  message = "Proposta não encontrada",
): AppError => appError("PROPOSAL_NOT_FOUND", message);

export const proposalForbidden = (
  message = "Você não tem acesso a esta proposta",
): AppError => appError("PROPOSAL_FORBIDDEN", message);

export const proposalNotPublished = (
  message = "Esta proposta não está disponível",
): AppError => appError("PROPOSAL_NOT_PUBLISHED", message);

export const documentTemplateNotFound = (
  message = "Template não encontrado",
): AppError => appError("DOCUMENT_TEMPLATE_NOT_FOUND", message);

export const landingPageNotFound = (
  message = "Página não encontrada",
): AppError => appError("LANDING_PAGE_NOT_FOUND", message);

export const landingPageNotPublished = (
  message = "Esta página não está disponível",
): AppError => appError("LANDING_PAGE_NOT_PUBLISHED", message);

export const landingPageSlugTaken = (
  message = "Já existe uma página com este slug nesta workspace",
): AppError => appError("LANDING_PAGE_SLUG_TAKEN", message);

export const formNotFound = (message = "Formulário não encontrado"): AppError =>
  appError("FORM_NOT_FOUND", message);

export const formNotPublished = (
  message = "Este formulário não está disponível",
): AppError => appError("FORM_NOT_PUBLISHED", message);

export const formFieldInvalid = (
  message = "Configuração de campo inválida",
  details?: unknown,
): AppError => appError("FORM_FIELD_INVALID", message, details);

export const aiNotConfigured = (
  message = "Assistente de IA não configurado. Falta a OPENAI_API_KEY no servidor.",
): AppError => appError("AI_NOT_CONFIGURED", message);

export const aiConversationNotFound = (
  message = "Conversa não encontrada",
): AppError => appError("AI_CONVERSATION_NOT_FOUND", message);

export const aiProviderFailed = (
  message = "Falha ao falar com o provedor de IA",
  details?: unknown,
): AppError => appError("AI_PROVIDER_FAILED", message, details);

export const aiMessageInvalid = (message = "Mensagem inválida"): AppError =>
  appError("AI_MESSAGE_INVALID", message);
