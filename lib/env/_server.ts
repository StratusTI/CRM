import { z } from "zod";

const serverEnv = {
  POSTGRES_USER: process.env.POSTGRES_USER,
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
  POSTGRES_DB: process.env.POSTGRES_DB,
  DATABASE_URL: process.env.DATABASE_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || undefined,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || undefined,
  HUGEICONS_TOKEN: process.env.HUGEICONS_TOKEN,
  // Conexão de redes sociais (OAuth). Opcionais: cada provedor só fica
  // disponível quando suas credenciais estão presentes (ver isConfigured()).
  // Instagram reaproveita FACEBOOK_APP_ID/SECRET (Instagram Graph API via FB Login).
  FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID || undefined,
  FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET || undefined,
  // ID da configuração do "Login do Facebook para Empresas" (Business Login).
  // Quando presente, a autorização usa `config_id` em vez de `scope`.
  FACEBOOK_CONFIG_ID: process.env.FACEBOOK_CONFIG_ID || undefined,
  TIKTOK_CLIENT_KEY: process.env.TIKTOK_CLIENT_KEY || undefined,
  TIKTOK_CLIENT_SECRET: process.env.TIKTOK_CLIENT_SECRET || undefined,
  // Twitter/X — app OAuth 2.0 (confidential client) no Developer Portal.
  TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID || undefined,
  TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET || undefined,
  // LinkedIn — app OAuth 2.0 no LinkedIn Developer Portal (linkedin.com/developers).
  // Escopos free: r_liteprofile, r_emailaddress, w_member_social.
  LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID || undefined,
  LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET || undefined,
  // Google Ads — token de desenvolvedor obtido no Google Ads API Center.
  // Reusa GOOGLE_CLIENT_ID/SECRET; adicione o escopo adwords no OAuth consent.
  GOOGLE_ADS_DEVELOPER_TOKEN:
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN || undefined,
  // Chave AES-256 (base64 de 32 bytes) para cifrar tokens em repouso.
  SOCIAL_TOKEN_ENCRYPTION_KEY:
    process.env.SOCIAL_TOKEN_ENCRYPTION_KEY || undefined,
};

const serverEnvSchema = z.object({
  POSTGRES_USER: z.string().min(2).max(63),
  POSTGRES_PASSWORD: z.string().min(8).max(128),
  POSTGRES_DB: z.string().min(1).max(63),
  DATABASE_URL: z.url().startsWith("postgresql://"),
  BETTER_AUTH_SECRET: z.string().min(16),
  BETTER_AUTH_URL: z.url().startsWith("http"),
  GOOGLE_CLIENT_ID: z
    .string()
    .min(10)
    .endsWith(".apps.googleusercontent.com")
    .optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(10).startsWith("GOCSPX-").optional(),
  HUGEICONS_TOKEN: z.string().regex(/^[A-F0-9]{8}(-[A-F0-9]{8}){3}$/),
  FACEBOOK_APP_ID: z.string().min(1).optional(),
  FACEBOOK_APP_SECRET: z.string().min(1).optional(),
  FACEBOOK_CONFIG_ID: z.string().min(1).optional(),
  TIKTOK_CLIENT_KEY: z.string().min(1).optional(),
  TIKTOK_CLIENT_SECRET: z.string().min(1).optional(),
  TWITTER_CLIENT_ID: z.string().min(1).optional(),
  TWITTER_CLIENT_SECRET: z.string().min(1).optional(),
  LINKEDIN_CLIENT_ID: z.string().min(1).optional(),
  LINKEDIN_CLIENT_SECRET: z.string().min(1).optional(),
  GOOGLE_ADS_DEVELOPER_TOKEN: z.string().min(1).optional(),
  SOCIAL_TOKEN_ENCRYPTION_KEY: z.string().min(1).optional(),
});

const validatedServerEnv =
  process.env.NODE_ENV === "test" || process.env.SKIP_ENV_VALIDATION === "true"
    ? (serverEnv as unknown as z.infer<typeof serverEnvSchema>)
    : serverEnvSchema.parse(serverEnv);

export const {
  POSTGRES_USER,
  POSTGRES_PASSWORD,
  POSTGRES_DB,
  DATABASE_URL,
  BETTER_AUTH_SECRET,
  BETTER_AUTH_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  HUGEICONS_TOKEN,
  FACEBOOK_APP_ID,
  FACEBOOK_APP_SECRET,
  FACEBOOK_CONFIG_ID,
  TIKTOK_CLIENT_KEY,
  TIKTOK_CLIENT_SECRET,
  TWITTER_CLIENT_ID,
  TWITTER_CLIENT_SECRET,
  LINKEDIN_CLIENT_ID,
  LINKEDIN_CLIENT_SECRET,
  GOOGLE_ADS_DEVELOPER_TOKEN,
  SOCIAL_TOKEN_ENCRYPTION_KEY,
} = validatedServerEnv;
